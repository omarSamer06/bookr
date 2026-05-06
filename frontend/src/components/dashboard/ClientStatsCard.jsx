import { Badge } from '@/components/ui/badge'

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? ''
  return (a + b).toUpperCase()
}

export default function ClientStatsCard({ data, isLoading }) {
  const newClientsThisMonth = (() => {
    const list = data?.newClientsPerMonth ?? []
    const now = new Date()
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    return list.find((r) => r.month === monthKey)?.count ?? 0
  })()

  const returningClientsCount = data?.returningClientsCount ?? 0
  const topClients = data?.topClients ?? []

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-heading text-lg font-bold tracking-tight text-bookr-text">Client insights</h2>
        <p className="mt-1 text-sm text-bookr-muted">Understand how clients return and book again.</p>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-50" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-50" />
          <div className="h-32 w-full animate-pulse rounded-2xl bg-gray-50" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <p className="text-sm font-medium text-bookr-text">New clients this month</p>
              <p className="font-heading text-xl font-bold text-indigo-700">{newClientsThisMonth}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <p className="text-sm font-medium text-bookr-text">Returning clients</p>
              <p className="font-heading text-xl font-bold text-violet-700">{returningClientsCount}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-xs font-semibold tracking-wide text-bookr-muted uppercase">Top clients</p>
            <div className="mt-3 space-y-2">
              {topClients.length ? (
                topClients.map((c) => (
                  <div key={c.clientId} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-purple-100 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
                        {initials(c.clientName)}
                      </span>
                      <span className="truncate text-sm font-medium text-bookr-text">{c.clientName || 'Unknown client'}</span>
                    </div>
                    <Badge variant="secondary" className="h-6 rounded-full bg-indigo-50 text-indigo-700">
                      {c.appointmentCount} appt
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-6 text-center text-sm text-bookr-muted">
                  No client stats yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

