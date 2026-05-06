import { useState } from 'react'
import { PaymentElement, useElements, useStripe, Elements } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BOOKING_PAYMENT_SESSION_KEY } from '@/lib/bookingPaymentRedirect'
import { stripePromise } from '@/lib/stripe'
import { cn } from '@/lib/utils'

/** Keeps Stripe iframe lifecycle scoped so booking payloads stay outside PCI boundaries */
function PaymentFormInner({
  amountCents,
  currency,
  appointmentPayload,
  paymentIntentId,
  onPaymentSuccess,
  disableSubmit,
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const formatted =
    currency?.toLowerCase() === 'usd'
      ? `$${(amountCents / 100).toFixed(2)}`
      : `${(amountCents / 100).toFixed(2)} ${String(currency || 'usd').toUpperCase()}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) {
      toast.error('Stripe is still loading — try again in a moment')
      return
    }
    if (disableSubmit) return

    setBusy(true)

    try {
      sessionStorage.setItem(
        BOOKING_PAYMENT_SESSION_KEY,
        JSON.stringify({
          paymentIntentId,
          payload: appointmentPayload,
        })
      )

      const { error: submitError } = await elements.submit()
      if (submitError) {
        toast.error(submitError.message ?? 'Check your payment details')
        return
      }

      const returnUrl = `${window.location.origin}/payment/success`

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message ?? 'Payment failed')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        sessionStorage.removeItem(BOOKING_PAYMENT_SESSION_KEY)
        onPaymentSuccess(paymentIntent.id)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">Total due now</p>
        <p className={cn('mt-2 font-heading text-3xl font-bold tabular-nums tracking-tight text-bookr-text')}>{formatted}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <PaymentElement />
      </div>

      <Button type="submit" className="w-full gap-2 sm:w-auto" size="lg" disabled={!stripe || busy || disableSubmit}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Processing…
          </>
        ) : (
          'Pay & confirm booking'
        )}
      </Button>
    </form>
  )
}

/** Elements boundary receives only client secrets — card PAN never touches React state */
export default function PaymentForm({
  clientSecret,
  amountCents,
  currency,
  appointmentPayload,
  paymentIntentId,
  onPaymentSuccess,
  disableSubmit = false,
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            borderRadius: '12px',
            colorPrimary: '#6366f1',
            colorBackground: '#ffffff',
            colorText: '#1e1b4b',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          },
        },
      }}
    >
      <PaymentFormInner
        amountCents={amountCents}
        currency={currency}
        appointmentPayload={appointmentPayload}
        paymentIntentId={paymentIntentId}
        onPaymentSuccess={onPaymentSuccess}
        disableSubmit={disableSubmit}
      />
    </Elements>
  )
}
