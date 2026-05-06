import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BOOKING_PAYMENT_SESSION_KEY } from '@/lib/bookingPaymentRedirect'
import { stripePromise } from '@/lib/stripe'
import { cn } from '@/lib/utils'
import { appointmentQueryKeys, createAppointment } from '@/services/appointment.service.js'

/** Finalizes bookings after Stripe-hosted redirects without trusting URL params alone */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    const clientSecret = searchParams.get('payment_intent_client_secret')
    const piFromUrl = searchParams.get('payment_intent')

    if (!clientSecret || !piFromUrl) {
      return
    }

    const dedupeKey = `bookr_finalize_${piFromUrl}`
    if (sessionStorage.getItem(dedupeKey)) {
      return
    }
    sessionStorage.setItem(dedupeKey, '1')

    async function finalize() {
      try {
        const stripe = await stripePromise
        if (!stripe) throw new Error('Stripe failed to initialize')

        const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret)
        if (error) throw new Error(error.message)

        if (paymentIntent.status !== 'succeeded') {
          setBanner('Payment is still processing — refresh your appointments list in a minute.')
          return
        }

        const raw = sessionStorage.getItem(BOOKING_PAYMENT_SESSION_KEY)
        if (!raw) {
          setBanner('Payment succeeded. Head to appointments — your booking may already be there.')
          return
        }

        const draft = JSON.parse(raw)
        if (draft.paymentIntentId !== paymentIntent.id) {
          sessionStorage.removeItem(BOOKING_PAYMENT_SESSION_KEY)
          setBanner('Payment succeeded, but this tab didn’t match your checkout draft — please verify appointments.')
          return
        }

        await createAppointment({
          ...draft.payload,
          paymentIntentId: paymentIntent.id,
        })

        sessionStorage.removeItem(BOOKING_PAYMENT_SESSION_KEY)
        await qc.invalidateQueries({ queryKey: ['appointments', 'mine'] })
        await qc.invalidateQueries({
          queryKey: appointmentQueryKeys.slots(
            draft.payload.businessId,
            draft.payload.date,
            draft.payload.serviceId
          ),
        })
        toast.success('Booking confirmed')
        navigate('/dashboard/appointments', { replace: true })
      } catch (err) {
        toast.error(err.message)
        setBanner(err.message)
      }
    }

    finalize()
  }, [navigate, qc, searchParams])

  const clientSecret = searchParams.get('payment_intent_client_secret')

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <Card className="border-gray-100 shadow-md">
        <CardHeader className="space-y-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80">
            <CheckCircle2 className="size-8" aria-hidden />
          </span>
          <div>
            <CardTitle className="font-heading text-2xl">Payment status</CardTitle>
            <CardDescription className="mt-2">
              {clientSecret
                ? 'Finalizing your booking after Stripe redirected back…'
                : 'You can review confirmations anytime from your appointments dashboard.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {banner ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{banner}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/dashboard/appointments" className={cn(buttonVariants({ size: 'lg' }), 'inline-flex justify-center')}>
              Go to my appointments
            </Link>
            <Link
              to="/businesses"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'inline-flex justify-center border-gray-200')}
            >
              Browse more businesses
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
