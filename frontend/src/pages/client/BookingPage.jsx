import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Check } from 'lucide-react'
import BookingSummary from '@/components/booking/BookingSummary'
import DatePicker from '@/components/booking/DatePicker'
import PaymentForm from '@/components/booking/PaymentForm'
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
import { createPaymentIntent } from '@/services/payment.service.js'
import { businessQueryKeys, getBusinessById } from '@/services/business.service.js'

/** Routes paid paths through Stripe Elements while free inventory still bypasses PCI scope entirely */
export default function BookingPage() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')

  const isPaidService = Number(selectedService?.price) > 0

  const stepLabels = useMemo(() => {
    const row = [
      { k: 1, label: 'Service' },
      { k: 2, label: 'Date' },
      { k: 3, label: 'Time' },
      { k: 4, label: 'Review' },
    ]
    if (isPaidService) row.push({ k: 5, label: 'Payment' })
    return row
  }, [isPaidService])

  useEffect(() => {
    if (!isPaidService && step === 5) setStep(4)
  }, [isPaidService, step])

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

  const {
    data: checkout,
    isLoading: checkoutLoading,
    isError: checkoutError,
    error: checkoutErr,
    refetch: refetchCheckout,
  } = useQuery({
    queryKey: ['payments', 'intent', businessId, selectedService?._id],
    queryFn: () => createPaymentIntent({ businessId, serviceId: selectedService._id }),
    enabled: Boolean(step === 5 && isPaidService && businessId && selectedService?._id),
    retry: false,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (!checkoutError) return
    toast.error(checkoutErr.message)
  }, [checkoutError, checkoutErr?.message])

  const bookMutation = useMutation({
    mutationFn: ({ paymentIntentId: pid } = {}) =>
      createAppointment({
        businessId,
        serviceId: selectedService._id,
        date: selectedDate,
        startTime: selectedSlot,
        notes,
        ...(pid ? { paymentIntentId: pid } : {}),
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

  const appointmentPayload = useMemo(
    () => ({
      businessId,
      serviceId: selectedService?._id,
      date: selectedDate,
      startTime: selectedSlot,
      notes,
    }),
    [businessId, selectedService?._id, selectedDate, selectedSlot, notes]
  )

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
          Paid visits authorize through Stripe — free visits skip checkout entirely.
        </p>
      </div>

      <ol className="flex flex-wrap gap-3">
        {stepLabels.map(({ k, label }) => (
          <li
            key={k}
            className={cn(
              'flex min-w-[140px] flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm',
              step === k ? 'border-primary/60 bg-primary/5' : 'border-border/70 text-muted-foreground'
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
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
            {step === 4 ? 'Review your visit' : null}
            {step === 5 ? 'Pay securely' : null}
          </CardTitle>
          <CardDescription>
            {step === 1 ? 'Pricing and duration freeze on the next step exactly as shown here.' : null}
            {step === 2 ? 'Closed weekdays are blocked to match this business profile.' : null}
            {step === 3 ? 'Only openings returned by Bookr right now can be claimed.' : null}
            {step === 4
              ? isPaidService
                ? 'Confirm details — Stripe collects the card on the next step.'
                : 'No card required for complimentary services.'
              : null}
            {step === 5
              ? 'Card data stays inside Stripe Elements — Bookr never sees your full PAN or CVC.'
              : null}
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
            <div className="space-y-6">
              <BookingSummary
                businessName={business.name}
                serviceName={selectedService?.name}
                durationMinutes={selectedService?.duration}
                dateStr={selectedDate}
                timeStr={selectedSlot}
                priceAmount={selectedService?.price}
              />

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

          {step === 5 && isPaidService ? (
            <div className="space-y-6">
              <BookingSummary
                businessName={business.name}
                serviceName={selectedService?.name}
                durationMinutes={selectedService?.duration}
                dateStr={selectedDate}
                timeStr={selectedSlot}
                priceAmount={selectedService?.price}
                notes={notes}
              />

              {checkoutLoading ? (
                <p className="text-sm text-muted-foreground">Preparing secure checkout…</p>
              ) : checkoutError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">Could not start checkout.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetchCheckout()}>
                    Retry
                  </Button>
                </div>
              ) : checkout?.clientSecret ? (
                <PaymentForm
                  clientSecret={checkout.clientSecret}
                  amountCents={checkout.amount}
                  currency={checkout.currency}
                  appointmentPayload={appointmentPayload}
                  paymentIntentId={checkout.paymentIntentId}
                  disableSubmit={bookMutation.isPending}
                  onPaymentSuccess={(paymentIntentId) => bookMutation.mutate({ paymentIntentId })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Checkout payload incomplete — go back and try again.</p>
              )}
            </div>
          ) : null}

          {step !== 5 ? (
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
                <Button
                  type="button"
                  onClick={() => (isPaidService ? setStep(5) : bookMutation.mutate({}))}
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? 'Booking…' : isPaidService ? 'Continue to payment' : 'Confirm booking'}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={bookMutation.isPending}
                onClick={() => setStep(4)}
              >
                Back to review
              </Button>
              <p className="text-xs text-muted-foreground self-center">Submit the payment using the button above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
