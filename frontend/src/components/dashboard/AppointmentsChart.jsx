import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const appt = payload.find((p) => p.dataKey === 'count')?.value ?? 0
  const rev = payload.find((p) => p.dataKey === 'revenue')?.value ?? 0
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-md">
      <p className="text-sm font-semibold text-bookr-text">{label}</p>
      <div className="mt-2 space-y-1 text-sm text-bookr-muted">
        <p>
          <span className="font-medium text-indigo-700">Appointments:</span> {appt}
        </p>
        <p>
          <span className="font-medium text-violet-700">Revenue:</span> {formatCurrency(rev)}
        </p>
      </div>
    </div>
  )
}

export default function AppointmentsChart({ period, onPeriodChange, data, isLoading }) {
  const options = useMemo(
    () => [
      { key: 'week', label: 'Week' },
      { key: 'month', label: 'Month' },
      { key: 'year', label: 'Year' },
    ],
    []
  )

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight text-bookr-text">Appointments over time</h2>
          <p className="mt-1 text-sm text-bookr-muted">Track bookings and revenue for the selected period.</p>
        </div>
        <div className="flex items-center gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => onPeriodChange(o.key)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                period === o.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-bookr-muted hover:text-bookr-text'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-72">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-gray-50" />
        ) : !data?.length ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 text-sm text-bookr-muted">
            No data yet for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="countFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                tickFormatter={(v) => Number(v).toFixed(0)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="count"
                name="Appointments"
                stroke="#6366f1"
                fill="url(#countFill)"
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#7c3aed"
                fill="url(#revFill)"
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

