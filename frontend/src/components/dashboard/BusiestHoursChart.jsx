import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'

function HoursTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-md">
      <p className="text-sm font-semibold text-bookr-text">{label}</p>
      <p className="mt-2 text-sm text-bookr-muted">
        <span className="font-medium text-indigo-700">Bookings:</span> {value}
      </p>
    </div>
  )
}

export default function BusiestHoursChart({ data, isLoading }) {
  const busiestHour = (data ?? []).reduce(
    (best, row) => (row.count > (best?.count ?? -1) ? row : best),
    null
  )

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-heading text-lg font-bold tracking-tight text-bookr-text">Busiest hours</h2>
        <p className="mt-1 text-sm text-bookr-muted">Spot peak demand to tune availability.</p>
      </div>

      <div className="mt-6 h-64">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-gray-50" />
        ) : !data?.length ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 text-sm text-bookr-muted">
            No bookings yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#94a3b8" interval={0} />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip content={<HoursTooltip />} />
              <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="url(#hoursFill)">
                {data.map((row, idx) => {
                  const isBusiest = busiestHour && row.hour === busiestHour.hour
                  return <Cell key={idx} fill={isBusiest ? '#4f46e5' : 'url(#hoursFill)'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

