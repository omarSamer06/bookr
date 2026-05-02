import { WEEKDAYS } from '@/lib/businessConstants'

/** Matches `<input type="date">` expectations while honoring browser-local calendars */
export function todayLocalIsoDate() {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Derives disabled weekdays straight from Business.workingHours.isOff flags */
export function closedWeekdayKeys(workingHours) {
  return WEEKDAYS.filter(({ key }) => workingHours?.[key]?.isOff).map(({ key }) => key)
}

/** Backend anchors bookings at UTC midnight — pairing it with clock strings stays deterministic */
export function parseAppointmentStartUtc(appointment) {
  const raw = appointment?.date
  const iso =
    typeof raw === 'string'
      ? raw
      : raw instanceof Date
        ? raw.toISOString()
        : ''
  const day = iso.slice(0, 10)
  const start = String(appointment?.startTime ?? '').trim()
  if (!day || day.length < 10 || !start) return new Date(NaN)
  const [hh = '00', mm = '00'] = start.split(':')
  return new Date(`${day}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00.000Z`)
}

/** UX comparisons treat “future” as still actionable for cancel/reschedule gates */
export function isAppointmentFuture(appointment) {
  const start = parseAppointmentStartUtc(appointment)
  return Number.isFinite(start.getTime()) && start.getTime() > Date.now()
}

/** Mirrors Mongo weekday keys so disabledDays props stay aligned with Business.workingHours */
export function weekdayKeyFromLocalIsoDate(isoDateStr) {
  const parts = String(isoDateStr).split('-').map(Number)
  const [y, m, d] = parts
  if (!y || !m || !d) return null
  const local = new Date(y, m - 1, d)
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return keys[local.getDay()] ?? null
}
