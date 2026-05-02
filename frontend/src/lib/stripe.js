import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''

/** One Promise keeps Stripe.js singleton semantics recommended across Elements trees */
export const stripePromise = loadStripe(publishableKey)
