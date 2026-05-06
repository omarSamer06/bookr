import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RecommendedSlotCard({ slot, reason, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200',
        selected
          ? 'border-indigo-600 bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-md'
          : 'border-indigo-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md'
      )}
    >
      {!selected ? (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="absolute inset-0 bg-linear-to-br from-indigo-50/80 via-white to-purple-50/60" />
        </div>
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className={cn('font-heading text-2xl font-bold tabular-nums', selected ? 'text-white' : 'text-bookr-text')}>
            {slot}
          </p>
          <p className={cn('mt-1 text-sm', selected ? 'text-white/85' : 'text-bookr-muted')}>{reason}</p>
        </div>
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-xl',
            selected ? 'bg-white/15 ring-1 ring-white/25' : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
          )}
        >
          <Sparkles className="size-4" aria-hidden />
        </span>
      </div>
    </button>
  )
}

