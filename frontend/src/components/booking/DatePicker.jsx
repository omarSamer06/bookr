import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { weekdayKeyFromLocalIsoDate } from '@/lib/bookingUtils'
import { cn } from '@/lib/utils'

/** Native `<input type="date">` stays accessible while weekday guards explain blocked closures */
export default function DatePicker({
  id,
  label,
  selectedDate,
  onChange,
  disabledDays = [],
  minDate,
  className,
}) {
  const min = minDate ?? ''

  const handleChange = (e) => {
    const value = e.target.value
    if (!value) {
      onChange(null)
      return
    }

    const key = weekdayKeyFromLocalIsoDate(value)
    if (key && disabledDays.includes(key)) {
      toast.error('This business is closed that day — pick another date.')
      return
    }

    onChange(value)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      {label ? (
        <Label htmlFor={id} className="text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <Input id={id} type="date" min={min} value={selectedDate ?? ''} onChange={handleChange} />
    </div>
  )
}
