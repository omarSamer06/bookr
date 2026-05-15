import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import BookingSummary from '@/components/booking/BookingSummary'
import DatePicker from '@/components/booking/DatePicker'
import PaymentForm from '@/components/booking/PaymentForm'
import SlotPicker from '@/components/booking/SlotPicker'
import RecommendationBanner from '@/components/booking/RecommendationBanner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { closedWeekdayKeys, getEffectiveCancellationPolicy, todayLocalIsoDate } from '@/lib/bookingUtils'
import { cn } from '@/lib/utils'
import useAuth from '@/hooks/useAuth'
import {
  appointmentQueryKeys,
  createAppointment,
  getAvailableSlots,
} from '@/services/appointment.service.js'
import { getRecommendations } from '@/services/recommendation.service.js'
import { createPaymentIntent } from '@/services/payment.service.js'
import { businessQueryKeys, getBusinessById } from '@/services/business.service.js'

/** Routes paid paths through Stripe Elements while free inventory still bypasses PCI scope entirely */
export default function BookingPage() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('online')

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

  const isPaidService = Number(selectedService?.price) > 0
  const paymentMode = business?.paymentMode ?? 'both'
  const mustPayOnline = paymentMode === 'online'
  const canPayOnArrival = paymentMode === 'on_arrival'
  const canChoosePayment = paymentMode === 'both' && isPaidService
  const payingOnArrival = canPayOnArrival || (canChoosePayment && paymentMethod === 'on_arrival')

  const resolvedStep = !isPaidService && step === 5 ? 4 : step

  const computedStepLabels = useMemo(() => {
    const row = [
      { k: 1, label: 'Service' },
      { k: 2, label: 'Date' },
      { k: 3, label: 'Time' },
      { k: 4, label: 'Review' },
    ]
    if (isPaidService && (mustPayOnline || (canChoosePayment && paymentMethod === 'online'))) {
      row.push({ k: 5, label: 'Payment' })
    }
    return row
  }, [isPaidService, mustPayOnline, canChoosePayment, paymentMethod])

  const activeServices = useMemo(
    () => (business?.services ?? []).filter((s) => s.isActive !== false),
    [business?.services]
  )

  const cancellationPolicy = useMemo(
    () => (business ? getEffectiveCancellationPolicy(business) : null),
    [business]
  )

  const disabledDays = useMemo(() => closedWeekdayKeys(business?.workingHours), [business?.workingHours])

  const handleSelectService = (s) => {
    setSelectedService(s)
    setSelectedDate(null)
    setSelectedSlot('')
    setPaymentMethod('online')
  }

  const handleDateChange = (d) => {
    setSelectedDate(d)
    setSelectedSlot('')
  }

  const {
    data: slots = [],
    isLoading: slotsLoading,
    isError: slotsError,
    error: slotsErr,
  } = useQuery({
    queryKey: appointmentQueryKeys.slots(businessId, selectedDate, selectedService?._id),
    queryFn: () => {
      if (import.meta.env.DEV) {
        // Helps catch timezone/date formatting issues when debugging "no slots" reports.
        console.log('[booking] fetching slots', {
          businessId,
          serviceId: selectedService?._id,
          date: selectedDate,
        })
      }
      return getAvailableSlots(businessId, selectedDate, selectedService._id)
    },
    enabled: Boolean(businessId && selectedDate && selectedService?._id && resolvedStep >= 3),
    staleTime: 30 * 1000,
  })

  const {
    data: recommendations,
    isLoading: recLoading,
    isError: recError,
  } = useQuery({
    queryKey: ['recommendations', businessId, selectedService?._id, selectedDate],
    queryFn: () => getRecommendations(businessId, selectedService._id, selectedDate),
    enabled: Boolean(
      isAuthenticated && businessId && selectedDate && selectedService?._id && resolvedStep >= 3
    ),
    retry: false,
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
    enabled: Boolean(
      step === 5 &&
        isPaidService &&
        businessId &&
        selectedService?._id &&
        (mustPayOnline || (canChoosePayment && paymentMethod === 'online')) &&
        !payingOnArrival
    ),
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
        ...(paymentMode === 'both' ? { paymentMethod } : {}),
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-bookr-muted">Missing business id.</div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10" aria-busy>
        <div className="h-5 w-40 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-10 max-w-md animate-pulse rounded-xl bg-gray-100" />
        <div className="h-4 max-w-md animate-pulse rounded bg-gray-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
      </div>
    )
  }

  if (isError || !business) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <p className="text-sm font-medium text-red-600">{error?.message ?? 'Business not found.'}</p>
        <Link to="/businesses" className={cn(buttonVariants(), 'mt-6')}>
          Back to directory
        </Link>
      </div>
    )
  }

  if (!activeServices.length) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-bookr-muted">This business hasn’t published bookable services yet.</p>
        <Link to={`/businesses/${businessId}`} className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}>
          Back to profile
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:py-10">
      <Link
        to={`/businesses/${businessId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to business
      </Link>

      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text sm:text-4xl">Book {business.name}</h1>
        <p className="mt-3 text-sm leading-relaxed text-bookr-muted sm:text-base">
          {paymentMode === 'on_arrival'
            ? 'Pay at the business — no online checkout required.'
            : paymentMode === 'both'
              ? 'Choose to pay online now or on arrival at checkout.'
              : 'Paid visits authorize through Stripe — free visits skip checkout entirely.'}
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 sm:gap-3">
        {computedStepLabels.map(({ k, label }) => (
          <li
            key={k}
            className={cn(
              'flex min-w-[120px] flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors',
              resolvedStep === k
                ? 'border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm'
                : resolvedStep > k
                  ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                  : 'border-gray-200 bg-white text-bookr-muted'
            )}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                resolvedStep > k ? 'bg-emerald-600 text-white' : resolvedStep === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-bookr-muted'
              )}
            >
              {resolvedStep > k ? <Check className="size-4" aria-hidden /> : k}
            </span>
            <span className="font-semibold">{label}</span>
          </li>
        ))}
      </ol>

      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle>
            {resolvedStep === 1 ? 'Choose a service' : null}
            {resolvedStep === 2 ? 'Choose a date' : null}
            {resolvedStep === 3 ? 'Choose a time' : null}
            {resolvedStep === 4 ? 'Review your visit' : null}
            {resolvedStep === 5 ? 'Pay securely' : null}
          </CardTitle>
          <CardDescription>
            {resolvedStep === 1 ? 'Pricing and duration freeze on the next step exactly as shown here.' : null}
            {resolvedStep === 2 ? 'Closed weekdays are blocked to match this business profile.' : null}
            {resolvedStep === 3 ? 'Only openings returned by Bookr right now can be claimed.' : null}
            {resolvedStep === 4
              ? isPaidService
                ? payingOnArrival
                  ? 'Confirm details — payment will be collected at the business.'
                  : 'Confirm details — Stripe collects the card on the next step.'
                : 'No card required for complimentary services.'
              : null}
            {resolvedStep === 5
              ? 'Card data stays inside Stripe Elements — Bookr never sees your full PAN or CVC.'
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {resolvedStep === 1 ? (
            <div className="grid gap-3">
              <Label>Services</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeServices.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => handleSelectService(s)}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-all duration-200',
                      selectedService?._id === s._id
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                        : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-heading font-bold text-bookr-text">{s.name}</p>
                        {s.description ? <p className="mt-2 text-sm text-bookr-muted">{s.description}</p> : null}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold text-indigo-700">${Number(s.price).toFixed(2)}</p>
                        <p className="text-bookr-muted">{s.duration} min</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {resolvedStep === 2 ? (
            <DatePicker
              id="bk-date"
              label="Appointment date"
              minDate={todayLocalIsoDate()}
              selectedDate={selectedDate}
              onChange={handleDateChange}
              disabledDays={disabledDays}
              hasRecommendations={Boolean(
                isAuthenticated && recommendations?.recommended?.length && !recError
              )}
            />
          ) : null}

          {resolvedStep === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">Selected day</p>
                  <p className="mt-1 font-semibold text-bookr-text">{selectedDate}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">Service</p>
                  <p className="mt-1 font-semibold text-bookr-text">{selectedService?.name}</p>
                </div>
              </div>
              {isAuthenticated &&
              !recError &&
              recommendations?.recommended?.some((r) => r.reason === 'Based on your history') ? (
                <RecommendationBanner />
              ) : null}
              <SlotPicker
                slots={slots}
                recommended={
                  isAuthenticated && !recError ? recommendations?.recommended ?? null : null
                }
                others={isAuthenticated && !recError ? recommendations?.others ?? null : null}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
                isLoading={isAuthenticated ? slotsLoading || recLoading : slotsLoading}
              />
            </div>
          ) : null}

          {resolvedStep === 4 ? (
            <div className="space-y-6">
              <BookingSummary
                businessName={business.name}
                serviceName={selectedService?.name}
                durationMinutes={selectedService?.duration}
                dateStr={selectedDate}
                timeStr={selectedSlot}
                priceAmount={selectedService?.price}
                paymentMethod={
                  isPaidService
                    ? payingOnArrival
                      ? 'on_arrival'
                      : 'online'
                    : 'online'
                }
              />

              {canChoosePayment ? (
                <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-bookr-text">Payment method</p>
                    {paymentMethod === 'on_arrival' ? (
                      <Badge className="rounded-full bg-blue-100 text-blue-700 border-0">Pay on arrival</Badge>
                    ) : (
                      <Badge className="rounded-full bg-emerald-100 text-emerald-700 border-0">Pay now</Badge>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all duration-200',
                        paymentMethod === 'online'
                          ? 'border-indigo-500 bg-linear-to-br from-indigo-50 to-purple-50 shadow-sm ring-1 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
                      )}
                    >
                      <p className="font-heading font-bold text-bookr-text">Pay now</p>
                      <p className="mt-2 text-sm text-bookr-muted">Secure online payment via Stripe.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('on_arrival')}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all duration-200',
                        paymentMethod === 'on_arrival'
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
                      )}
                    >
                      <p className="font-heading font-bold text-bookr-text">Pay on arrival</p>
                      <p className="mt-2 text-sm text-bookr-muted">Payment will be collected at the business.</p>
                    </button>
                  </div>
                </div>
              ) : payingOnArrival && isPaidService ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-blue-800">
                  Payment will be collected at the business.
                </div>
              ) : null}

              {cancellationPolicy ? (
                cancellationPolicy.allowed ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
                    ✓ Free cancellation up to {cancellationPolicy.hoursBeforeAppointment} hours before appointment
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 text-sm text-red-800">
                    ⚠️ This business does not allow cancellations
                  </div>
                )
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="bk-notes">Notes (optional)</Label>
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
                <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" aria-busy>
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
                  <div className="h-32 animate-pulse rounded-xl bg-gray-50" />
                </div>
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

          {resolvedStep !== 5 ? (
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={resolvedStep === 1 || bookMutation.isPending}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                Back
              </Button>

              {resolvedStep < 4 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (resolvedStep === 1) nextFromStep1()
                    if (resolvedStep === 2) nextFromStep2()
                    if (resolvedStep === 3) nextFromStep3()
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    if (!isPaidService) {
                      bookMutation.mutate({})
                      return
                    }
                    if (payingOnArrival) {
                      bookMutation.mutate({})
                      return
                    }
                    setStep(5)
                  }}
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Booking…
                    </>
                  ) : isPaidService && !payingOnArrival ? (
                    'Proceed to payment'
                  ) : (
                    'Confirm booking'
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-6">
              <Button type="button" variant="outline" disabled={bookMutation.isPending} onClick={() => setStep(4)}>
                Back to review
              </Button>
              <p className="self-center text-xs text-bookr-muted">Submit the payment using the button above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
