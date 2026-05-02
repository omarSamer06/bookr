/** Buckets rows for section headers without shifting “today” at UTC midnight */
export function getNotificationDayBucket(sentAtInput) {
  const d = new Date(sentAtInput)
  if (!Number.isFinite(d.getTime())) return 'earlier'

  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startSent = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startToday - startSent) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  return 'earlier'
}
