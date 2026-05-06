import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WEEKDAYS } from '@/lib/businessConstants'

const defaultDay = () => ({
  isOff: false,
  open: '09:00',
  close: '17:00',
})

function buildHours(initialWorkingHours) {
  const base = {}
  for (const { key } of WEEKDAYS) {
    base[key] = {
      ...defaultDay(),
      ...(initialWorkingHours?.[key] ?? {}),
    }
  }
  return base
}

/** Single PATCH batches weekly rhythm changes so slots stay consistent server-side */
export default function WorkingHoursForm({
  initialWorkingHours,
  initialSlotDuration,
  onSubmit,
  isPending,
}) {
  const [hours, setHours] = useState(() => buildHours(initialWorkingHours))
  const [slotDuration, setSlotDuration] = useState(String(initialSlotDuration ?? 30))

  const [prevWh, setPrevWh] = useState(initialWorkingHours)
  const [prevSd, setPrevSd] = useState(initialSlotDuration)
  if (initialWorkingHours !== prevWh || initialSlotDuration !== prevSd) {
    setPrevWh(initialWorkingHours)
    setPrevSd(initialSlotDuration)
    setHours(buildHours(initialWorkingHours))
    setSlotDuration(String(initialSlotDuration ?? 30))
  }

  const updateDay = (key, patch) => {
    setHours((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const sd = Number(slotDuration)
    if (Number.isNaN(sd) || sd < 5 || sd > 480) return
    onSubmit({ workingHours: hours, slotDuration: sd })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {WEEKDAYS.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-[140px] items-center gap-2">
              <Checkbox
                checked={hours[key].isOff}
                onCheckedChange={(v) => updateDay(key, { isOff: Boolean(v) })}
              />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-bookr-muted">closed</span>
            </div>
            <div className="flex flex-1 flex-wrap items-end gap-3 sm:justify-end">
              <div className="grid gap-1">
                <Label className="text-xs" htmlFor={`open-${key}`}>
                  Opens
                </Label>
                <Input
                  id={`open-${key}`}
                  type="time"
                  value={hours[key].open}
                  disabled={hours[key].isOff}
                  onChange={(e) => updateDay(key, { open: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs" htmlFor={`close-${key}`}>
                  Closes
                </Label>
                <Input
                  id={`close-${key}`}
                  type="time"
                  value={hours[key].close}
                  disabled={hours[key].isOff}
                  onChange={(e) => updateDay(key, { close: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid max-w-xs gap-2">
        <Label htmlFor="slot-dur">Slot duration (minutes)</Label>
        <Input
          id="slot-dur"
          type="number"
          min={5}
          max={480}
          value={slotDuration}
          onChange={(e) => setSlotDuration(e.target.value)}
        />
        <p className="text-xs text-bookr-muted">Smallest bookable increment customers will see later.</p>
      </div>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Saving hours…
          </>
        ) : (
          'Save schedule'
        )}
      </Button>
    </form>
  )
}
