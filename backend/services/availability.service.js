import Business from '../models/Business.js';
import Appointment from '../models/Appointment.js';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MINUTES_IN_DAY = 24 * 60;

/** Parses "HH:mm" into minutes-from-midnight for stable numeric comparisons */
function timeToMinutes(timeStr) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59 || Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

/** Converts minutes to canonical "HH:mm", wrapping past 24:00 (overnight support) */
function minutesToTime(totalMinutes) {
  const wrapped = ((Number(totalMinutes) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Adds minutes to an "HH:mm" string */
function addMinutesToClock(startStr, deltaMinutes) {
  const start = timeToMinutes(startStr);
  if (start === null || !Number.isFinite(deltaMinutes)) return null;
  return minutesToTime(start + deltaMinutes);
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

function debugLog(...args) {
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG_AVAILABILITY !== '1') return;
  console.log('[availability]', ...args);
}

function isOvernightSchedule(openMinutes, closeMinutes) {
  return Number.isFinite(openMinutes) && Number.isFinite(closeMinutes) && closeMinutes < openMinutes;
}

function normalizeWorkingHoursDay(workingHours, dayKey) {
  if (!workingHours || typeof workingHours !== 'object') return null;
  if (workingHours[dayKey]) return workingHours[dayKey];
  const foundKey = Object.keys(workingHours).find((k) => String(k).toLowerCase() === String(dayKey).toLowerCase());
  return foundKey ? workingHours[foundKey] : null;
}

function isDayOff(day) {
  if (!day) return true;
  if (day.isOff === true) return true;
  if (typeof day.isOff === 'string') return day.isOff.trim().toLowerCase() === 'true';
  return Boolean(day.isOff);
}

function normalizeTimeIntoWindow(minutes, openMinutes, overnight) {
  if (minutes == null) return null;
  if (!overnight) return minutes;
  // When open->close spans midnight, times after midnight belong to the "next-day" portion of the same window.
  return minutes < openMinutes ? minutes + MINUTES_IN_DAY : minutes;
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
function appointmentIntervalsMinutes(appointments, openMinutes, overnight) {
  const intervals = [];
  for (const appt of appointments) {
    let s = timeToMinutes(appt.startTime);
    let e = timeToMinutes(appt.endTime);
    s = normalizeTimeIntoWindow(s, openMinutes, overnight);
    e = normalizeTimeIntoWindow(e, openMinutes, overnight);
    if (s === null || e === null) continue;
    // End before start indicates the appointment itself spans midnight.
    if (e <= s) e += MINUTES_IN_DAY;
    if (s === null || e === null || e <= s) continue;
    intervals.push([s, e]);
  }
  return intervals;
}

/** Checks booking interval against global business breaks */
function overlapsAnyBreak(bookingStartM, bookingEndM, breaks, openMinutes, overnight) {
  for (const br of breaks || []) {
    let bs = timeToMinutes(br.start);
    let be = timeToMinutes(br.end);
    bs = normalizeTimeIntoWindow(bs, openMinutes, overnight);
    be = normalizeTimeIntoWindow(be, openMinutes, overnight);
    if (bs === null || be === null || be <= bs) continue;
    if (be <= bs) be += MINUTES_IN_DAY;
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
  const day = normalizeWorkingHoursDay(business.workingHours, dayKey);

  debugLog('request', {
    businessId: String(businessId),
    dateInput: String(dateInput),
    dateUtcMidnight: dateUtcMidnight.toISOString(),
    dayKey,
    workingHoursKeys: Object.keys(business.workingHours || {}),
    day,
    slotDuration: business.slotDuration,
    breaks: (business.breaks || []).length,
  });

  if (!day || isDayOff(day)) {
    debugLog('closed/day-off', { dayKey, isOff: day?.isOff });
    return [];
  }

  const openM = timeToMinutes(day.open);
  const closeRawM = timeToMinutes(day.close);
  if (openM === null || closeRawM === null) {
    debugLog('invalid-hours', { dayKey, open: day.open, close: day.close, openM, closeM: closeRawM });
    return [];
  }

  const overnight = isOvernightSchedule(openM, closeRawM);
  const closeM = overnight ? closeRawM + MINUTES_IN_DAY : closeRawM;

  // Overnight logic: if a business closes after midnight (e.g. 09:00–01:00),
  // we extend the close boundary into the next day so the loop can generate slots past 24:00.
  if (closeM <= openM) {
    debugLog('invalid-hours', { dayKey, open: day.open, close: day.close, openM, closeM, overnight });
    return [];
  }

  // Slot starts are generated per-service so longer services don't appear bookable every 30 minutes.
  const slotStep = duration;

  const blocking = await loadBlockingAppointments(business._id, dateUtcMidnight);
  const bookedIntervals = appointmentIntervalsMinutes(blocking, openM, overnight);

  const slots = [];

  // Grid-aligned starts honor how owners configured spacing without overlapping closing time
  for (let startM = openM; startM < closeM; startM += slotStep) {
    const endM = startM + duration;
    if (endM > closeM) break;

    if (overlapsAnyBreak(startM, endM, business.breaks, openM, overnight)) continue;
    if (overlapsAnyAppointment(startM, endM, bookedIntervals)) continue;

    slots.push(minutesToTime(startM));
  }

  debugLog('result', {
    dayKey,
    isOff: day.isOff,
    open: day.open,
    close: day.close,
    openM,
    closeM,
    overnight,
    slotStep,
    serviceDurationMinutes: duration,
    blockingCount: blocking.length,
    slotsCount: slots.length,
    slotsPreview: slots.slice(0, 12),
  });

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

  const business = await Business.findById(businessId).select('workingHours').lean();
  const dayKey = utcWeekdayKey(dateUtcMidnight);
  const day = normalizeWorkingHoursDay(business?.workingHours, dayKey);
  const openM = timeToMinutes(day?.open);
  const closeRawM = timeToMinutes(day?.close);
  const overnight = isOvernightSchedule(openM, closeRawM);

  const filter = {
    business: businessId,
    date: dateUtcMidnight,
    status: { $in: ['pending', 'confirmed'] },
  };
  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }

  const blocking = await Appointment.find(filter).select('startTime endTime').lean();

  let startM = timeToMinutes(startStr);
  let endM = timeToMinutes(endStr);
  startM = normalizeTimeIntoWindow(startM, openM ?? 0, overnight);
  endM = normalizeTimeIntoWindow(endM, openM ?? 0, overnight);
  if (startM === null || endM === null) return true;
  if (endM <= startM) endM += MINUTES_IN_DAY;

  for (const appt of blocking) {
    let as = timeToMinutes(appt.startTime);
    let ae = timeToMinutes(appt.endTime);
    as = normalizeTimeIntoWindow(as, openM ?? 0, overnight);
    ae = normalizeTimeIntoWindow(ae, openM ?? 0, overnight);
    if (as === null || ae === null) continue;
    if (ae <= as) ae += MINUTES_IN_DAY;
    if (intervalsOverlapHalfOpen(startM, endM, as, ae)) return true;
  }
  return false;
}

export { addMinutesToClock, timeToMinutes, minutesToTime, isOvernightSchedule };
