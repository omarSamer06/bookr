import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

function formatDateTime(dateValue, startTime) {
  const d = dateValue ? new Date(dateValue) : null
  const date = d && !Number.isNaN(d.valueOf()) ? d.toLocaleDateString() : '—'
  const time = startTime ? String(startTime) : ''
  return time ? `${date} · ${time}` : date
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (s === 'confirmed') return 'bg-indigo-50 text-indigo-700 border-indigo-100'
  if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-100'
  if (s === 'cancelled') return 'bg-gray-100 text-gray-700 border-gray-200'
  if (s === 'no-show') return 'bg-red-50 text-red-700 border-red-100'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

function paymentBadgeClass(paymentStatus) {
  const p = String(paymentStatus || '').toLowerCase()
  if (p === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (p === 'refunded') return 'bg-violet-50 text-violet-700 border-violet-100'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function RecentActivityFeed({ data, isLoading }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-bookr-text">Recent activity</h2>
          <p className="mt-1 text-sm text-bookr-muted">Your latest appointments and payment status.</p>
        </div>
        <Link to="/dashboard/business/appointments" className="text-sm font-semibold text-indigo-700 hover:underline underline-offset-4">
          View all
        </Link>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-gray-50" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-12 text-center text-sm text-bookr-muted">
            No appointments yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            {data.map((row, idx) => (
              <div
                key={row._id ?? idx}
                className={cn(
                  'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-purple-100 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
                    {initials(row.clientName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-bookr-text">
                      {row.clientName || 'Unknown client'}{' '}
                      <span className="font-normal text-bookr-muted">· {row.service || 'Service'}</span>
                    </p>
                    <p className="text-xs text-bookr-muted">{formatDateTime(row.date, row.startTime)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant="outline" className={cn('h-6 rounded-full', statusBadgeClass(row.status))}>
                    {row.status}
                  </Badge>
                  <Badge variant="outline" className={cn('h-6 rounded-full', paymentBadgeClass(row.paymentStatus))}>
                    {row.paymentStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

