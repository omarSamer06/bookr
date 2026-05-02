import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Slot grids reuse one responsive layout so Booking + reschedule flows stay visually aligned */
export default function SlotPicker({ slots = [], selectedSlot, onSelect, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-muted" aria-hidden />
        ))}
      </div>
    )
  }

  if (!slots.length) {
    return (
      <p className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">
        No slots available for this day.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {slots.map((slot) => (
        <Button
          key={slot}
          type="button"
          size="sm"
          variant={selectedSlot === slot ? 'default' : 'outline'}
          className={cn('tabular-nums')}
          onClick={() => onSelect(slot)}
        >
          {slot}
        </Button>
      ))}
    </div>
  )
}
