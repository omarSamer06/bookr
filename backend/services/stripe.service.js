import Stripe from 'stripe';

// Lazily constructs the client so missing keys during unrelated scripts fail loudly only when charging
let stripeSingleton;

/** Shared Stripe SDK instance avoids reconnect churn across controllers */
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe is not configured');
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

/** Normalizes arbitrary metadata values because Stripe rejects non-string entries */
function stringifyMetadata(metadata) {
  const flat = {};
  for (const [k, v] of Object.entries(metadata || {})) {
    flat[k] = v === undefined || v === null ? '' : String(v);
  }
  return flat;
}

/** Issues an incomplete PaymentIntent for Elements without committing inventory rows yet */
export async function createPaymentIntent(amountCents, currency, metadata = {}) {
  const stripe = getStripe();
  const curr = String(currency || 'usd').toLowerCase();

  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: curr,
    metadata: stringifyMetadata(metadata),
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/** Preserves the raw byte payload Stripe signs — parsing before verify breaks signatures */
export function constructWebhookEvent(payload, signatureHeader) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Stripe webhook secret is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signatureHeader, secret);
}

/** Retrieves intents during booking so forged IDs cannot hijack someone else’s authorization */
export async function retrievePaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(String(paymentIntentId || '').trim());
}

/** Blocks mismatched Stripe rows from reserving inventory under another payer’s authorization */
export async function verifyPaymentIntentForAppointmentBooking({
  paymentIntentId,
  expectedClientId,
  expectedBusinessId,
  expectedServiceId,
  expectedAmountCents,
}) {
  const pi = await retrievePaymentIntent(paymentIntentId);

  const md = pi.metadata || {};
  const clientOk = md.clientId === String(expectedClientId);
  const businessOk = md.businessId === String(expectedBusinessId);
  const serviceOk = md.serviceId === String(expectedServiceId);

  if (!clientOk) {
    const err = new Error('PaymentIntent does not belong to this client');
    err.statusCode = 403;
    throw err;
  }
  if (!businessOk || !serviceOk) {
    const err = new Error('PaymentIntent does not match this booking selection');
    err.statusCode = 400;
    throw err;
  }
  if (Number(pi.amount) !== Number(expectedAmountCents)) {
    const err = new Error('PaymentIntent amount mismatch — recreate the checkout session');
    err.statusCode = 400;
    throw err;
  }
  if (pi.status === 'canceled') {
    const err = new Error('PaymentIntent was canceled');
    err.statusCode = 400;
    throw err;
  }

  return pi;
}

/** Issues full refunds without exposing partial-refund knobs owners didn’t ask for yet */
export async function createRefund(paymentIntentId) {
  const stripe = getStripe();
  return stripe.refunds.create({
    payment_intent: String(paymentIntentId || '').trim(),
  });
}
