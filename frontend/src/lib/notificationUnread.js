const DAY_MS = 24 * 60 * 60 * 1000

/** Mirrors the bell heuristic: anything dispatched inside the rolling window feels “new” */
export function countRecentNotifications(notifications) {
  const now = Date.now()
  return notifications.filter((n) => {
    const t = new Date(n.sentAt).getTime()
    return Number.isFinite(t) && now - t >= 0 && now - t < DAY_MS
  }).length
}
