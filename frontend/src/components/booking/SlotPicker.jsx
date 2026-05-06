import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import RecommendedSlotCard from '@/components/booking/RecommendedSlotCard'

/** Slot grids reuse one responsive layout so Booking + reschedule flows stay visually aligned */
export default function SlotPicker({
  slots = [],
  recommended = null,
  others = null,
  selectedSlot,
  onSelect,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5" aria-busy>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-gray-100" aria-hidden />
        ))}
      </div>
    )
  }

  const hasSmart = Array.isArray(recommended) && Array.isArray(others)
  const allSlots = hasSmart ? [...(recommended ?? []).map((r) => r.slot), ...(others ?? [])] : slots

  if (!allSlots.length) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center text-sm text-bookr-muted">
        No slots available for this day.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {hasSmart && (recommended ?? []).length ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-bookr-text">✨ Recommended for you</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {recommended.map((r) => (
              <RecommendedSlotCard
                key={r.slot}
                slot={r.slot}
                reason={r.reason}
                selected={selectedSlot === r.slot}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ) : null}

      {hasSmart && (recommended ?? []).length ? (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <p className="text-xs font-semibold tracking-wide text-bookr-muted uppercase">All available slots</p>
          <div className="h-px flex-1 bg-gray-100" />
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {(hasSmart ? others ?? [] : slots).map((slot) => (
          <Button
            key={slot}
            type="button"
            size="sm"
            variant={selectedSlot === slot ? 'default' : 'outline'}
            className={cn(
              'h-11 rounded-xl border font-semibold tabular-nums transition-all duration-200',
              selectedSlot === slot
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm hover:scale-[1.02]'
                : 'border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50'
            )}
            onClick={() => onSelect(slot)}
          >
            {slot}
          </Button>
        ))}
      </div>
    </div>
  )
}
