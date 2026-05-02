import mongoose from 'mongoose';
import Business from '../models/Business.js';
import Appointment from '../models/Appointment.js';
import {
  constructWebhookEvent,
  createPaymentIntent as stripeCreatePaymentIntent,
  createRefund,
} from '../services/stripe.service.js';
import { sendAppointmentConfirmation } from '../services/notification.service.js';

/** Mirrors the appointment owner lookup so refunds can’t pivot across tenants */
async function findOwnedBusiness(ownerId) {
  return Business.findOne({ owner: ownerId });
}

/** Exposes a PaymentIntent client secret without mutating schedules — booking still goes through appointments */
export const createPaymentIntent = async (req, res) => {
  try {
    const { businessId, serviceId, appointmentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(String(businessId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business id',
        data: {},
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(serviceId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service id',
        data: {},
      });
    }

    if (
      appointmentId !== undefined &&
      appointmentId !== null &&
      appointmentId !== '' &&
      !mongoose.Types.ObjectId.isValid(String(appointmentId))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    const business = await Business.findById(businessId);
    if (!business?.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const service = business.services.id(serviceId);
    if (!service?.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        data: {},
      });
    }

    const price = Number(service.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service price',
        data: {},
      });
    }

    if (price === 0) {
      return res.status(400).json({
        success: false,
        message: 'Free services do not require Stripe checkout — book directly',
        data: {},
      });
    }

    const amountCents = Math.round(price * 100);

    const currency = String(process.env.STRIPE_DEFAULT_CURRENCY || 'usd').toLowerCase();

    const intent = await stripeCreatePaymentIntent(amountCents, currency, {
      appointmentId: appointmentId ? String(appointmentId) : '',
      businessId: String(business._id),
      clientId: String(req.user._id),
      serviceId: String(serviceId),
    });

    return res.status(200).json({
      success: true,
      message: 'PaymentIntent created',
      data: {
        clientSecret: intent.client_secret,
        amount: amountCents,
        currency,
        paymentIntentId: intent.id,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not create payment intent',
      data: {},
    });
  }
};

/**
 * Stripe retries failures aggressively — verified signatures still ACK 200 after internal failures so ops can replay safely.
 * Signature mismatches stay 400 so misconfigured secrets surface immediately instead of silently “succeeding”.
 */
export const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const updated = await Appointment.findOneAndUpdate(
        { paymentIntentId: pi.id },
        {
          $set: {
            paymentStatus: 'paid',
            status: 'confirmed',
          },
        },
        { new: true }
      );

      if (updated) {
        const populated = await Appointment.findById(updated._id)
          .populate({ path: 'client', select: 'name email phone' })
          .populate({ path: 'business', select: 'name location phone website' });

        sendAppointmentConfirmation(populated).catch((err) =>
          console.error('[notify] paid confirmation', err.message)
        );
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      await Appointment.findOneAndUpdate(
        { paymentIntentId: pi.id },
        {
          $set: {
            paymentStatus: 'unpaid',
            status: 'cancelled',
          },
        }
      );
    }
  } catch (err) {
    console.error('Stripe webhook processing error:', err);
  }

  return res.status(200).json({
    success: true,
    message: 'Webhook received',
    data: {},
  });
};

/** Lets owners claw back settled charges without handing Stripe dashboards to staff */
export const refundPayment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(appointmentId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      business: business._id,
    })
      .populate({ path: 'client', select: 'name email phone' })
      .populate({ path: 'business', select: 'name owner category location phone' });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
        data: {},
      });
    }

    if (!['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Refunds apply only after checkout settles — completed visits or cancelled bookings',
        data: {},
      });
    }

    if (appointment.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Only paid appointments can be refunded',
        data: {},
      });
    }

    if (!appointment.paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing Stripe payment reference',
        data: {},
      });
    }

    await createRefund(appointment.paymentIntentId);

    appointment.paymentStatus = 'refunded';
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: 'Refund issued',
      data: { appointment },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message?.includes?.('Stripe') ? err.message : 'Could not issue refund',
      data: {},
    });
  }
};
