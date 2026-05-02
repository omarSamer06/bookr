/** Humanizes timestamps for inbox rows without pulling a date library into the bundle */
export function formatRelativeTime(input) {
  const date = new Date(input)
  const t = date.getTime()
  if (!Number.isFinite(t)) return '—'

  const diffMs = Date.now() - t
  const sec = Math.round(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  const week = Math.round(day / 7)
  if (week < 5) return `${week} week${week === 1 ? '' : 's'} ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
