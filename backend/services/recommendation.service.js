import mongoose from 'mongoose';
import Business from '../models/Business.js';
import Appointment from '../models/Appointment.js';
import { addMinutesToClock, getAvailableSlots, timeToMinutes, utcStartOfDay } from './availability.service.js';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function weekdayNameFromUtcMidnight(dateUtcMidnight) {
  const idx = dateUtcMidnight.getUTCDay();
  return WEEKDAY_KEYS[idx];
}

function timeBucket(slot) {
  const mins = timeToMinutes(slot);
  if (mins == null) return 'unknown';
  const hour = Math.floor(mins / 60);
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17) return 'evening';
  return 'other';
}

function slotDateTimeUtc(dateUtcMidnight, slot) {
  const mins = timeToMinutes(slot);
  if (mins == null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return new Date(Date.UTC(dateUtcMidnight.getUTCFullYear(), dateUtcMidnight.getUTCMonth(), dateUtcMidnight.getUTCDate(), h, m));
}

function bucketFromPatterns(patterns) {
  const counts = patterns?.timeOfDayCounts ?? { morning: 0, afternoon: 0, evening: 0, other: 0 };
  const entries = Object.entries(counts);
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (!top || top[1] <= 0) return null;
  return top[0];
}

/**
 * Analyzes the client's past appointments for this business to infer simple preferences
 * without storing sensitive behavioral profiles outside of what already exists in bookings.
 */
export async function getClientBookingPatterns(clientId, businessId) {
  if (!mongoose.Types.ObjectId.isValid(String(clientId || ''))) {
    const err = new Error('Invalid client id');
    err.statusCode = 400;
    throw err;
  }
  if (!mongoose.Types.ObjectId.isValid(String(businessId || ''))) {
    const err = new Error('Invalid business id');
    err.statusCode = 400;
    throw err;
  }

  const match = {
    business: new mongoose.Types.ObjectId(businessId),
    client: new mongoose.Types.ObjectId(clientId),
    status: { $ne: 'cancelled' },
  };

  const [agg = null] = await Appointment.aggregate([
    { $match: match },
    {
      $facet: {
        hours: [
          { $group: { _id: '$startTime', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        days: [
          {
            $group: {
              _id: {
                $dayOfWeek: {
                  date: '$date',
                  timezone: 'UTC',
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1, _id: 1 } },
        ],
        total: [{ $count: 'count' }],
      },
    },
    {
      $project: {
        _id: 0,
        hours: 1,
        days: 1,
        totalPastBookings: { $ifNull: [{ $first: '$total.count' }, 0] },
      },
    },
  ]);

  const totalPastBookings = agg?.totalPastBookings ?? 0;

  if (!totalPastBookings) {
    return {
      preferredHours: [],
      preferredDays: [],
      totalPastBookings: 0,
      timeOfDayCounts: { morning: 0, afternoon: 0, evening: 0, other: 0 },
    };
  }

  const preferredHours = (agg?.hours ?? []).map((h) => h._id);

  const preferredDays = (agg?.days ?? []).map((d) => {
    // Mongo $dayOfWeek: Sunday=1 ... Saturday=7
    const idx = Number(d._id) - 1;
    return WEEKDAY_KEYS[idx] ?? 'unknown';
  });

  const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0, other: 0 };
  for (const row of agg?.hours ?? []) {
    const bucket = timeBucket(row._id);
    timeOfDayCounts[bucket] = (timeOfDayCounts[bucket] ?? 0) + (row.count ?? 0);
  }

  return { preferredHours, preferredDays, totalPastBookings, timeOfDayCounts };
}

/**
 * Scores a slot using deterministic heuristics so recommendations remain explainable.
 * Returns { score, signals } where signals help pick a user-facing reason label.
 */
export function scoreSlot(slot, dateUtcMidnight, patterns, existingAppointmentsCount, businessPeakHours, context) {
  let score = 0;

  const signals = {
    history: 0,
    lessBusy: 0,
    availability: 0,
    popular: 0,
    proximity: 0,
  };

  const preferredHours = patterns?.preferredHours ?? [];
  const preferredDays = patterns?.preferredDays ?? [];
  const preferredBucket = bucketFromPatterns(patterns);

  // (+30) Client history preference: recurring hour choices feel personalized.
  if (preferredHours.includes(slot)) {
    score += 30;
    signals.history += 30;
  }

  // (+20) Day-of-week preference: clients often book on consistent weekdays.
  const dayName = weekdayNameFromUtcMidnight(dateUtcMidnight);
  if (preferredDays.includes(dayName)) {
    score += 20;
    signals.history += 20;
  }

  // (+15) Time-of-day preference: morning/afternoon/evening trend from their own history.
  if (preferredBucket && timeBucket(slot) === preferredBucket) {
    score += 15;
    signals.history += 15;
  }

  // (-10) Peak-hours penalty: slightly distribute load away from the busiest hours.
  if ((businessPeakHours ?? []).includes(slot)) {
    score -= 10;
    signals.popular += 10;
  }

  // (+10) Proximity bonus: sooner slots are nicer when browsing near-term availability.
  const slotDt = slotDateTimeUtc(dateUtcMidnight, slot);
  if (slotDt) {
    const ms = slotDt.getTime() - Date.now();
    if (ms >= 0 && ms <= 48 * 60 * 60 * 1000) {
      score += 10;
      signals.proximity += 10;
    }
  }

  // (+5 per empty neighbor) Buffer preference: adjacent empties make reschedules less stressful.
  const neighbors = context?.neighborSlots ?? [];
  const emptyNeighbors = neighbors.filter((s) => (context?.availableSlotSet?.has(s) ? true : false)).length;
  if (emptyNeighbors > 0) {
    const bonus = 5 * emptyNeighbors;
    score += bonus;
    signals.availability += bonus;
  }

  // Least-busy preference: de-emphasize chronically crowded start times across all dates.
  const crowd = Number(existingAppointmentsCount) || 0;
  if (crowd <= 1) {
    score += 8;
    signals.lessBusy += 8;
  } else {
    score -= Math.min(16, crowd * 2);
    signals.popular += 4;
  }

  return { score, signals };
}

function pickReason(signals, patterns) {
  const hasHistory = (patterns?.totalPastBookings ?? 0) > 0;
  if (hasHistory && signals.history >= 30) return 'Based on your history';
  if (signals.lessBusy >= 8) return 'Less busy';
  if (signals.availability >= 10) return 'Great availability';
  return 'Popular time';
}

async function getBusinessPeakHours(businessId) {
  const rows = await Appointment.aggregate([
    {
      $match: {
        business: new mongoose.Types.ObjectId(businessId),
        status: { $ne: 'cancelled' },
      },
    },
    { $group: { _id: '$startTime', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 5 },
    { $project: { _id: 0, hour: '$_id', count: 1 } },
  ]);
  return (rows ?? []).map((r) => r.hour);
}

async function getStartTimeCounts(businessId) {
  const rows = await Appointment.aggregate([
    {
      $match: {
        business: new mongoose.Types.ObjectId(businessId),
        status: { $ne: 'cancelled' },
      },
    },
    { $group: { _id: '$startTime', count: { $sum: 1 } } },
    { $project: { _id: 0, startTime: '$_id', count: 1 } },
  ]);
  const map = new Map();
  for (const r of rows ?? []) map.set(r.startTime, r.count ?? 0);
  return map;
}

function neighborStarts(slot, slotStepMinutes) {
  const step = Number(slotStepMinutes);
  if (!Number.isFinite(step) || step < 5) return [];
  const prev = addMinutesToClock(slot, -step);
  const next = addMinutesToClock(slot, step);
  return [prev, next].filter(Boolean);
}

/**
 * Returns top recommended starts and the remaining starts so the UI can still show full choice.
 */
export async function getRecommendedSlots(businessId, clientId, serviceId, dateInput) {
  if (!mongoose.Types.ObjectId.isValid(String(businessId || ''))) {
    const err = new Error('Invalid business id');
    err.statusCode = 400;
    throw err;
  }
  if (!mongoose.Types.ObjectId.isValid(String(serviceId || ''))) {
    const err = new Error('Invalid service id');
    err.statusCode = 400;
    throw err;
  }

  const business = await Business.findById(businessId).lean();
  if (!business?.isActive) {
    const err = new Error('Business not found');
    err.statusCode = 404;
    throw err;
  }

  const service = (business.services ?? []).find((s) => String(s._id) === String(serviceId) && s.isActive !== false);
  if (!service) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    throw err;
  }

  const dateUtcMidnight = utcStartOfDay(dateInput);
  if (!dateUtcMidnight) {
    const err = new Error('Invalid date');
    err.statusCode = 400;
    throw err;
  }

  const availableSlots = await getAvailableSlots(business._id, dateUtcMidnight, service.duration);
  const availableSlotSet = new Set(availableSlots);

  if (!availableSlots.length) {
    return { recommended: [], others: [] };
  }

  const [patterns, peakHours, countsMap] = await Promise.all([
    getClientBookingPatterns(clientId, business._id),
    getBusinessPeakHours(business._id),
    getStartTimeCounts(business._id),
  ]);

  // Recommendations use the same per-service cadence as slot generation.
  const slotStep = Number(service.duration) || 30;

  const scored = availableSlots.map((slot) => {
    const existingCount = countsMap.get(slot) ?? 0;
    const neighbors = neighborStarts(slot, slotStep);
    const { score, signals } = scoreSlot(
      slot,
      dateUtcMidnight,
      patterns,
      existingCount,
      peakHours,
      { neighborSlots: neighbors, availableSlotSet }
    );
    const reason = pickReason(signals, patterns);
    return { slot, score, reason };
  });

  scored.sort((a, b) => b.score - a.score || a.slot.localeCompare(b.slot));

  const recommended = scored.slice(0, 3).map((r) => ({
    slot: r.slot,
    score: Math.round(r.score),
    reason: r.reason,
  }));

  const recommendedSet = new Set(recommended.map((r) => r.slot));
  const others = availableSlots.filter((s) => !recommendedSet.has(s));

  return { recommended, others };
}

