import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  const TrendIcon = trend?.isPositive ? ArrowUpRight : ArrowDownRight
  const trendColor = trend?.isPositive ? 'text-emerald-600' : 'text-red-600'

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-bookr-muted uppercase">{title}</p>
          <p className="mt-2 truncate font-heading text-3xl font-bold tracking-tight text-bookr-text">{value}</p>
          {subtitle ? <p className="mt-1 text-sm text-bookr-muted">{subtitle}</p> : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-purple-600 text-white shadow-sm">
            {Icon ? <Icon className="size-5" aria-hidden /> : null}
          </span>
          {trend ? (
            <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', trendColor)}>
              <TrendIcon className="size-4" aria-hidden />
              {trend.value}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

