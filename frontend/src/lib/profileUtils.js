/** Derives display initials from a full name */
export function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}
