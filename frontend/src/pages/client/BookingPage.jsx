import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Check } from 'lucide-react'
import DatePicker from '@/components/booking/DatePicker'
import SlotPicker from '@/components/booking/SlotPicker'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { closedWeekdayKeys, todayLocalIsoDate } from '@/lib/bookingUtils'
import { cn } from '@/lib/utils'
import {
  appointmentQueryKeys,
  createAppointment,
  getAvailableSlots,
} from '@/services/appointment.service.js'
import { businessQueryKeys, getBusinessById } from '@/services/business.service.js'

/** Steps isolate validation so availability calls only fire once service + day are committed */
export default function BookingPage() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')

  const {
    data: business,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: businessQueryKeys.detail(businessId),
    queryFn: () => getBusinessById(businessId),
    enabled: Boolean(businessId),
    retry: false,
  })

  const activeServices = useMemo(
    () => (business?.services ?? []).filter((s) => s.isActive !== false),
    [business?.services]
  )

  const disabledDays = useMemo(() => closedWeekdayKeys(business?.workingHours), [business?.workingHours])

  useEffect(() => {
    setSelectedSlot('')
  }, [selectedDate, selectedService?._id])

  const {
    data: slots = [],
    isLoading: slotsLoading,
    isError: slotsError,
    error: slotsErr,
  } = useQuery({
    queryKey: appointmentQueryKeys.slots(businessId, selectedDate, selectedService?._id),
    queryFn: () => getAvailableSlots(businessId, selectedDate, selectedService._id),
    enabled: Boolean(businessId && selectedDate && selectedService?._id && step >= 3),
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!slotsError) return
    toast.error(slotsErr.message)
  }, [slotsError, slotsErr?.message])

  const bookMutation = useMutation({
    mutationFn: () =>
      createAppointment({
        businessId,
        serviceId: selectedService._id,
        date: selectedDate,
        startTime: selectedSlot,
        notes,
      }),
    onSuccess: async () => {
      toast.success('Booking confirmed')
      await qc.invalidateQueries({ queryKey: ['appointments', 'mine'] })
      await qc.invalidateQueries({
        queryKey: appointmentQueryKeys.slots(businessId, selectedDate, selectedService._id),
      })
      navigate('/dashboard/appointments', { replace: true })
    },
    onError: (err) => toast.error(err.message),
  })

  const nextFromStep1 = () => {
    if (!selectedService) {
      toast.error('Pick a service to continue')
      return
    }
    setStep(2)
  }

  const nextFromStep2 = () => {
    if (!selectedDate) {
      toast.error('Pick a date to continue')
      return
    }
    setStep(3)
  }

  const nextFromStep3 = () => {
    if (!selectedSlot) {
      toast.error('Pick a time slot to continue')
      return
    }
    setStep(4)
  }

  if (!businessId) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        Missing business id.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        Loading business…
      </div>
    )
  }

  if (isError || !business) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-destructive">{error?.message ?? 'Business not found.'}</p>
        <Link to="/businesses" className={cn(buttonVariants(), 'mt-4 inline-flex')}>
          Back to directory
        </Link>
      </div>
    )
  }

  if (!activeServices.length) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">This business hasn’t published bookable services yet.</p>
        <Link to={`/businesses/${businessId}`} className={cn(buttonVariants({ variant: 'secondary' }), 'inline-flex')}>
          Back to profile
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Link
        to={`/businesses/${businessId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to business
      </Link>

      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Book {business.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Walk through services, timing, and confirmation — slots stay live as others book.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-4">
        {[
          { k: 1, label: 'Service' },
          { k: 2, label: 'Date' },
          { k: 3, label: 'Time' },
          { k: 4, label: 'Confirm' },
        ].map(({ k, label }) => (
          <li
            key={k}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
              step === k ? 'border-primary/60 bg-primary/5' : 'border-border/70 text-muted-foreground'
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {step > k ? <Check className="size-4" aria-hidden /> : k}
            </span>
            <span className="font-medium text-foreground">{label}</span>
          </li>
        ))}
      </ol>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>
            {step === 1 ? 'Choose a service' : null}
            {step === 2 ? 'Choose a date' : null}
            {step === 3 ? 'Choose a time' : null}
            {step === 4 ? 'Review & confirm' : null}
          </CardTitle>
          <CardDescription>
            {step === 1 ? 'Pricing and duration freeze on the next step exactly as shown here.' : null}
            {step === 2 ? 'Closed weekdays are blocked to match this business profile.' : null}
            {step === 3 ? 'Only openings returned by Bookr right now can be claimed.' : null}
            {step === 4 ? 'You can revisit or change this booking from your appointments dashboard.' : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 ? (
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Services</Label>
              <div className="grid gap-2">
                {activeServices.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => setSelectedService(s)}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-left transition-colors',
                      selectedService?._id === s._id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/70 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                        ) : null}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">${Number(s.price).toFixed(2)}</p>
                        <p className="text-muted-foreground">{s.duration} min</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <DatePicker
              id="bk-date"
              label="Appointment date"
              minDate={todayLocalIsoDate()}
              selectedDate={selectedDate}
              onChange={setSelectedDate}
              disabledDays={disabledDays}
            />
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Selected day</p>
                  <p className="font-medium">{selectedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium">{selectedService?.name}</p>
                </div>
              </div>
              <SlotPicker
                slots={slots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
                isLoading={slotsLoading}
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground">Service</p>
                    <p className="font-medium">{selectedService?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-medium">${Number(selectedService?.price ?? 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground">When</p>
                    <p className="font-medium">
                      {selectedDate} · {selectedSlot}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{selectedService?.duration} min</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bk-notes" className="text-muted-foreground">
                  Notes (optional)
                </Label>
                <Textarea
                  id="bk-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, parking needs, preferred pronouns…"
                  className="min-h-24 resize-none"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1 || bookMutation.isPending}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={() => {
                  if (step === 1) nextFromStep1()
                  if (step === 2) nextFromStep2()
                  if (step === 3) nextFromStep3()
                }}
              >
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
                {bookMutation.isPending ? 'Booking…' : 'Confirm booking'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
