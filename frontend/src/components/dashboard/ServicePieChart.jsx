import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts'

const SLICE_COLORS = ['#6366f1', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-md">
      <p className="text-sm font-semibold text-bookr-text">{row.serviceName}</p>
      <div className="mt-2 space-y-1 text-sm text-bookr-muted">
        <p>
          <span className="font-medium text-indigo-700">Bookings:</span> {row.count}
        </p>
        <p>
          <span className="font-medium text-violet-700">Revenue:</span> {formatCurrency(row.revenue)}
        </p>
        <p>
          <span className="font-medium text-bookr-text">Share:</span> {Number(row.percentage || 0).toFixed(0)}%
        </p>
      </div>
    </div>
  )
}

export default function ServicePieChart({ data, isLoading }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-heading text-lg font-bold tracking-tight text-bookr-text">Service breakdown</h2>
        <p className="mt-1 text-sm text-bookr-muted">See which services clients book most.</p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="h-56 w-full animate-pulse rounded-2xl bg-gray-50" />
        ) : !data?.length ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 text-sm text-bookr-muted">
            No services booked yet.
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<PieTooltip />} />
                <Pie data={data} dataKey="count" nameKey="serviceName" innerRadius={58} outerRadius={86} paddingAngle={2}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={SLICE_COLORS[idx % SLICE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {!isLoading && data?.length ? (
        <div className="mt-4 space-y-2">
          {data.slice(0, 6).map((s, idx) => (
            <div key={`${s.serviceName}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                  aria-hidden
                />
                <span className="truncate font-medium text-bookr-text">{s.serviceName}</span>
              </div>
              <span className="shrink-0 text-bookr-muted">{Number(s.percentage || 0).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

