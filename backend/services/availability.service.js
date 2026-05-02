import Business from '../models/Business.js';
import Appointment from '../models/Appointment.js';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Parses "HH:mm" into minutes-from-midnight for stable numeric comparisons */
function timeToMinutes(timeStr) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59 || Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

/** Converts minutes-from-midnight to canonical "HH:mm" */
function minutesToLabel(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Adds minutes to an "HH:mm" string */
function addMinutesToClock(startStr, deltaMinutes) {
  const start = timeToMinutes(startStr);
  if (start === null || !Number.isFinite(deltaMinutes)) return null;
  return minutesToLabel(start + deltaMinutes);
}

/** Half-open interval overlap keeps touching endpoints non-blocking (back-to-back bookings allowed) */
function intervalsOverlapHalfOpen(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/** Normalizes any Date input to UTC midnight for the same calendar day */
export function utcStartOfDay(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Maps the UTC calendar weekday to Business.workingHours keys */
function utcWeekdayKey(dateUtcMidnight) {
  const dow = dateUtcMidnight.getUTCDay();
  return WEEKDAY_KEYS[dow];
}

/** Loads blocking appointments so concurrent pending/confirmed ranges exclude generated slots */
async function loadBlockingAppointments(businessId, dateUtcMidnight) {
  return Appointment.find({
    business: businessId,
    date: dateUtcMidnight,
    status: { $in: ['pending', 'confirmed'] },
  })
    .select('startTime endTime')
    .lean();
}

/** Returns numeric intervals [start,end) for booked ranges */
function appointmentIntervalsMinutes(appointments) {
  const intervals = [];
  for (const appt of appointments) {
    const s = timeToMinutes(appt.startTime);
    const e = timeToMinutes(appt.endTime);
    if (s === null || e === null || e <= s) continue;
    intervals.push([s, e]);
  }
  return intervals;
}

/** Checks booking interval against global business breaks */
function overlapsAnyBreak(bookingStartM, bookingEndM, breaks) {
  for (const br of breaks || []) {
    const bs = timeToMinutes(br.start);
    const be = timeToMinutes(br.end);
    if (bs === null || be === null || be <= bs) continue;
    if (intervalsOverlapHalfOpen(bookingStartM, bookingEndM, bs, be)) return true;
  }
  return false;
}

/** Checks booking interval against existing bookings */
function overlapsAnyAppointment(bookingStartM, bookingEndM, appointmentIntervals) {
  for (const [as, ae] of appointmentIntervals) {
    if (intervalsOverlapHalfOpen(bookingStartM, bookingEndM, as, ae)) return true;
  }
  return false;
}

/**
 * Builds candidate slot labels between open/close stepped by slotDuration,
 * excluding breaks, excluding overlaps with pending/confirmed appointments,
 * and excluding ranges that extend past closing.
 */
export async function getAvailableSlots(businessId, dateInput, serviceDurationMinutes) {
  const duration = Number(serviceDurationMinutes);
  if (!Number.isFinite(duration) || duration < 1) return [];

  const business = await Business.findById(businessId).lean();
  if (!business?.isActive) return [];

  const dateUtcMidnight = utcStartOfDay(dateInput);
  if (!dateUtcMidnight) return [];

  const dayKey = utcWeekdayKey(dateUtcMidnight);
  const day = business.workingHours?.[dayKey];
  if (!day || day.isOff) return [];

  const openM = timeToMinutes(day.open);
  const closeM = timeToMinutes(day.close);
  if (openM === null || closeM === null || closeM <= openM) return [];

  const step = Number(business.slotDuration);
  const slotStep = Number.isFinite(step) && step >= 5 ? step : 30;

  const blocking = await loadBlockingAppointments(business._id, dateUtcMidnight);
  const bookedIntervals = appointmentIntervalsMinutes(blocking);

  const slots = [];

  // Grid-aligned starts honor how owners configured spacing without overlapping closing time
  for (let startM = openM; startM < closeM; startM += slotStep) {
    const endM = startM + duration;
    if (endM > closeM) break;

    if (overlapsAnyBreak(startM, endM, business.breaks)) continue;
    if (overlapsAnyAppointment(startM, endM, bookedIntervals)) continue;

    slots.push(minutesToLabel(startM));
  }

  return slots;
}

/**
 * Final gate before inserts/reschedules so stale UI selections can't slip past availability rules.
 */
export async function isSlotAvailable(businessId, dateInput, startTimeStr, serviceDurationMinutes) {
  const slots = await getAvailableSlots(businessId, dateInput, serviceDurationMinutes);
  return slots.includes(String(startTimeStr || '').trim());
}

/**
 * Detects blocking overlaps against persisted appointments — narrows races between parallel bookings.
 */
export async function bookingOverlapsBlockingAppointment(
  businessId,
  dateInput,
  startStr,
  endStr,
  excludeAppointmentId = null
) {
  const dateUtcMidnight = utcStartOfDay(dateInput);
  if (!dateUtcMidnight) return true;

  const filter = {
    business: businessId,
    date: dateUtcMidnight,
    status: { $in: ['pending', 'confirmed'] },
  };
  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }

  const blocking = await Appointment.find(filter).select('startTime endTime').lean();

  const startM = timeToMinutes(startStr);
  const endM = timeToMinutes(endStr);
  if (startM === null || endM === null || endM <= startM) return true;

  for (const appt of blocking) {
    const as = timeToMinutes(appt.startTime);
    const ae = timeToMinutes(appt.endTime);
    if (as === null || ae === null || ae <= as) continue;
    if (intervalsOverlapHalfOpen(startM, endM, as, ae)) return true;
  }
  return false;
}

export { addMinutesToClock, timeToMinutes };
