import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import DatePicker from '@/components/booking/DatePicker'
import SlotPicker from '@/components/booking/SlotPicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { closedWeekdayKeys, todayLocalIsoDate } from '@/lib/bookingUtils'
import {
  appointmentQueryKeys,
  getAvailableSlots,
  rescheduleAppointment,
} from '@/services/appointment.service.js'
import { businessQueryKeys, getBusinessById } from '@/services/business.service.js'

/** Matches embedded snapshots back to live ids so slot API params stay honest when services drift */
function resolveServiceId(business, snapshot) {
  if (!business || !snapshot) return null
  const list = (business.services ?? []).filter((s) => s.isActive !== false)
  const hit = list.find(
    (s) =>
      s.name === snapshot.name &&
      Number(s.duration) === Number(snapshot.duration) &&
      Number(s.price) === Number(snapshot.price)
  )
  return hit?._id ?? null
}

/** Keeps reschedule UX identical to BookingPage slot fetching without duplicating query wiring */
function RescheduleModalInner({ appointment, onOpenChange }) {
  const qc = useQueryClient()
  const businessId = appointment?.business?._id ?? appointment?.business

  const [selectedDate, setSelectedDate] = useState(() => todayLocalIsoDate())
  const [selectedSlot, setSelectedSlot] = useState(null)

  const { data: business } = useQuery({
    queryKey: businessQueryKeys.detail(businessId),
    queryFn: () => getBusinessById(businessId),
    enabled: Boolean(businessId),
  })

  const serviceId = useMemo(
    () => resolveServiceId(business, appointment?.service),
    [business, appointment?.service]
  )

  const disabledDays = useMemo(() => closedWeekdayKeys(business?.workingHours), [business?.workingHours])

  const handleDateChange = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const [prevServiceId, setPrevServiceId] = useState(serviceId)
  if (serviceId !== prevServiceId) {
    setPrevServiceId(serviceId)
    setSelectedSlot(null)
  }

  const {
    data: slots = [],
    isLoading: slotsLoading,
    isError: slotsError,
    error: slotsErr,
  } = useQuery({
    queryKey: appointmentQueryKeys.slots(businessId, selectedDate, serviceId),
    queryFn: () => getAvailableSlots(businessId, selectedDate, serviceId),
    enabled: Boolean(businessId && selectedDate && serviceId),
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!slotsError) return
    toast.error(slotsErr.message)
  }, [slotsError, slotsErr?.message])

  const rescheduleMutation = useMutation({
    mutationFn: ({ date, startTime }) => rescheduleAppointment(appointment._id, { date, startTime }),
    onSuccess: async () => {
      toast.success('Appointment rescheduled')
      await qc.invalidateQueries({ queryKey: ['appointments', 'mine'] })
      await qc.invalidateQueries({ queryKey: ['appointments', 'business'] })
      await qc.invalidateQueries({ queryKey: appointmentQueryKeys.detail(appointment._id) })
      if (businessId && selectedDate && serviceId) {
        await qc.invalidateQueries({
          queryKey: appointmentQueryKeys.slots(businessId, selectedDate, serviceId),
        })
      }
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error('Pick a new date and time first')
      return
    }
    if (!serviceId) {
      toast.error('Original service no longer matches an active offering — contact the business.')
      return
    }
    rescheduleMutation.mutate({ date: selectedDate, startTime: selectedSlot })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reschedule appointment</DialogTitle>
        <DialogDescription>Choose another open slot — your booking drops back to pending for the owner.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        {!serviceId && business ? (
          <p className="text-sm text-destructive">
            We couldn’t map this booking to an active service anymore. Ask the business to restore the service or cancel
            this appointment.
          </p>
        ) : null}

        <DatePicker
          id="rs-date"
          label="New date"
          minDate={todayLocalIsoDate()}
          selectedDate={selectedDate}
          onChange={handleDateChange}
          disabledDays={disabledDays}
        />

        <div className="grid gap-2">
          <Label>New time</Label>
          <SlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
            isLoading={slotsLoading}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={rescheduleMutation.isPending || !serviceId}>
          {rescheduleMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            'Save new time'
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

export default function RescheduleModal({ open, onOpenChange, appointment }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && appointment?._id ? (
          <RescheduleModalInner key={appointment._id} appointment={appointment} onOpenChange={onOpenChange} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
