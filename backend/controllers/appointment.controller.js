import mongoose from 'mongoose';
import Business from '../models/Business.js';
import Appointment from '../models/Appointment.js';
import {
  addMinutesToClock,
  bookingOverlapsBlockingAppointment,
  getAvailableSlots,
  isSlotAvailable,
  utcStartOfDay,
} from '../services/availability.service.js';
import { verifyPaymentIntentForAppointmentBooking } from '../services/stripe.service.js';
import {
  sendAppointmentCancellation,
  sendAppointmentConfirmation,
  sendAppointmentReschedule,
} from '../services/notification.service.js';

/** Keeps calendar math aligned with how `date` is persisted (UTC midnight) so filters stay honest */
function parseUtcDateOnly(dateStr) {
  const raw = String(dateStr ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const utc = new Date(Date.UTC(y, mo - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d) return null;
  return utc;
}

/** Matches the schema rule of one Business per owner without accepting ids from the request body */
async function findOwnedBusiness(ownerId) {
  return Business.findOne({ owner: ownerId });
}

/** Returns grid-aligned strings clients can pick before authentication blocks writes */
export const getAvailableSlotsHandler = async (req, res) => {
  try {
    const { businessId, date, serviceId } = req.query;

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

    const parsedDate = parseUtcDateOnly(date);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: 'date must be YYYY-MM-DD',
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

    const slots = await getAvailableSlots(business._id, parsedDate, service.duration);

    return res.status(200).json({
      success: true,
      message: 'Available slots retrieved',
      data: { slots },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not compute availability',
      data: {},
    });
  }
};

/** Persists a booking after recomputing availability so stale selections cannot overlap */
export const createAppointment = async (req, res) => {
  try {
    const { businessId, serviceId, date, startTime, notes, paymentIntentId } = req.body;

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

    const parsedDate = parseUtcDateOnly(date);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: 'date must be YYYY-MM-DD',
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

    const normalizedStart = String(startTime || '').trim();
    if (!normalizedStart) {
      return res.status(400).json({
        success: false,
        message: 'startTime is required',
        data: {},
      });
    }

    const duration = Number(service.duration);

    const slotOk = await isSlotAvailable(business._id, parsedDate, normalizedStart, duration);
    if (!slotOk) {
      return res.status(409).json({
        success: false,
        message: 'Selected slot is no longer available',
        data: {},
      });
    }

    const endTime = addMinutesToClock(normalizedStart, duration);
    if (!endTime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startTime format — use HH:mm',
        data: {},
      });
    }

    const overlaps = await bookingOverlapsBlockingAppointment(
      business._id,
      parsedDate,
      normalizedStart,
      endTime,
      null
    );
    if (overlaps) {
      return res.status(409).json({
        success: false,
        message: 'Selected slot conflicts with another booking',
        data: {},
      });
    }

    const price = Number(service.price);
    const isFree = Number.isFinite(price) && price === 0;

    let paymentIntentIdNorm = '';
    let initialPaymentStatus = 'unpaid';
    let initialStatus = 'pending';

    if (isFree) {
      initialPaymentStatus = 'paid';
      initialStatus = 'confirmed';
    } else {
      paymentIntentIdNorm = String(paymentIntentId || '').trim();
      if (!paymentIntentIdNorm) {
        return res.status(400).json({
          success: false,
          message: 'paymentIntentId is required for paid services',
          data: {},
        });
      }

      const amountCents = Math.round(price * 100);

      try {
        const pi = await verifyPaymentIntentForAppointmentBooking({
          paymentIntentId: paymentIntentIdNorm,
          expectedClientId: req.user._id,
          expectedBusinessId: business._id,
          expectedServiceId: serviceId,
          expectedAmountCents: amountCents,
        });

        if (pi.status === 'succeeded') {
          initialPaymentStatus = 'paid';
          initialStatus = 'confirmed';
        }
      } catch (err) {
        const statusCode = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 400;
        return res.status(statusCode).json({
          success: false,
          message: err.message || 'Payment verification failed',
          data: {},
        });
      }
    }

    const appointment = await Appointment.create({
      business: business._id,
      client: req.user._id,
      service: {
        name: service.name,
        duration,
        price: Number(service.price),
      },
      date: utcStartOfDay(parsedDate),
      startTime: normalizedStart,
      endTime,
      paymentIntentId: paymentIntentIdNorm,
      paymentStatus: initialPaymentStatus,
      status: initialStatus,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : '',
    });

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'business', select: 'name category location phone' })
      .populate({ path: 'client', select: 'name email phone' });

    if (isFree) {
      sendAppointmentConfirmation(populated).catch((err) =>
        console.error('[notify] free confirmation', err.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment booked',
      data: { appointment: populated },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not create appointment',
      data: {},
    });
  }
};

/** Lists the authenticated client's bookings with optional status/upcoming narrowing */
export const getMyAppointments = async (req, res) => {
  try {
    const { status, upcoming } = req.query;

    const filter = { client: req.user._id };

    const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];
    if (status !== undefined && String(status).trim()) {
      if (!allowedStatuses.includes(String(status))) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${allowedStatuses.join(', ')}`,
          data: {},
        });
      }
      filter.status = String(status);
    }

    if (String(upcoming || '').toLowerCase() === 'true') {
      const today = utcStartOfDay(new Date());
      filter.date = { $gte: today };
    }

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, startTime: 1 })
      .populate({
        path: 'business',
        select: 'name owner category location',
        populate: { path: 'owner', select: 'name email phone' },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Your appointments',
      data: { appointments },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load appointments',
      data: {},
    });
  }
};

/** Owner-facing agenda pulled from their lone Business profile without trusting ids from clients */
export const getBusinessAppointments = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const { status, upcoming, date } = req.query;
    const filter = { business: business._id };

    const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];
    if (status !== undefined && String(status).trim()) {
      if (!allowedStatuses.includes(String(status))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status filter',
          data: {},
        });
      }
      filter.status = String(status);
    }

    if (String(upcoming || '').toLowerCase() === 'true') {
      const today = utcStartOfDay(new Date());
      filter.date = { $gte: today };
    }

    if (date !== undefined && String(date).trim()) {
      const day = parseUtcDateOnly(date);
      if (!day) {
        return res.status(400).json({
          success: false,
          message: 'date filter must be YYYY-MM-DD',
          data: {},
        });
      }
      filter.date = utcStartOfDay(day);
    }

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, startTime: 1 })
      .populate({ path: 'client', select: 'name email phone' })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Business appointments',
      data: { appointments },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load appointments',
      data: {},
    });
  }
};

/** Shares appointment detail only when viewer is the booking client or owning shop user */
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    const appointment = await Appointment.findById(id)
      .populate({
        path: 'business',
        select: 'name owner category location phone',
        populate: { path: 'owner', select: 'name email phone' },
      })
      .populate({ path: 'client', select: 'name email phone' })
      .populate({ path: 'cancelledBy', select: 'name email role' });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
        data: {},
      });
    }

    const isClient = appointment.client._id.toString() === req.user._id.toString();
    let isOwner = false;
    if (req.user.role === 'owner') {
      const owned = await findOwnedBusiness(req.user._id);
      isOwner = owned && owned._id.toString() === appointment.business._id.toString();
    }

    if (!isClient && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this appointment',
        data: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment retrieved',
      data: { appointment },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load appointment',
      data: {},
    });
  }
};

/** Centralizes viewer checks so cancellation cannot be spoofed via forged business ids */
async function appointmentAccessibleOrThrow(req, appointmentId) {
  const appt = await Appointment.findById(appointmentId).populate({
    path: 'business',
    select: 'owner',
  });

  if (!appt) {
    const err = new Error('NOT_FOUND');
    throw err;
  }

  const isClient = appt.client.toString() === req.user._id.toString();

  let isOwner = false;
  if (req.user.role === 'owner') {
    const owned = await findOwnedBusiness(req.user._id);
    isOwner = owned && owned._id.toString() === appt.business._id.toString();
  }

  if (!isClient && !isOwner) {
    const err = new Error('FORBIDDEN');
    throw err;
  }

  return { appt, isClient, isOwner };
}

/** Advances operational workflow states without resurrecting cancelled rows back to pending */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    const allowed = ['confirmed', 'completed', 'no-show'];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(', ')}`,
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
      _id: id,
      business: business._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
        data: {},
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cancelled appointments cannot change status here',
        data: {},
      });
    }

    appointment.status = status;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'business', select: 'name owner category location phone' })
      .populate({ path: 'client', select: 'name email phone' });

    return res.status(200).json({
      success: true,
      message: 'Appointment status updated',
      data: { appointment: populated },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not update appointment status',
      data: {},
    });
  }
};

/** Soft-cancels with attribution while letting owners halt disruptive bookings centrally */
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    let ctx;
    try {
      ctx = await appointmentAccessibleOrThrow(req, id);
    } catch (e) {
      if (e.message === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found',
          data: {},
        });
      }
      if (e.message === 'FORBIDDEN') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to cancel this appointment',
          data: {},
        });
      }
      throw e;
    }

    const { appt } = ctx;

    if (appt.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled',
        data: {},
      });
    }

    appt.status = 'cancelled';
    appt.cancelledAt = new Date();
    appt.cancelledBy = req.user._id;
    await appt.save();

    const populated = await Appointment.findById(appt._id)
      .populate({ path: 'business', select: 'name category location phone' })
      .populate({ path: 'client', select: 'name email phone' })
      .populate({ path: 'cancelledBy', select: 'name email role' });

    sendAppointmentCancellation(populated).catch((err) =>
      console.error('[notify] cancellation', err.message)
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled',
      data: { appointment: populated },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not cancel appointment',
      data: {},
    });
  }
};

/** Moves a booking after excluding its old slot from overlap detection so swaps stay honest */
export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
        data: {},
      });
    }

    if (appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reschedule this appointment',
        data: {},
      });
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This appointment cannot be rescheduled',
        data: {},
      });
    }

    const parsedDate = parseUtcDateOnly(date);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: 'date must be YYYY-MM-DD',
        data: {},
      });
    }

    const normalizedStart = String(startTime || '').trim();
    if (!normalizedStart) {
      return res.status(400).json({
        success: false,
        message: 'startTime is required',
        data: {},
      });
    }

    const duration = Number(appointment.service.duration);

    const slotOk = await isSlotAvailable(
      appointment.business,
      parsedDate,
      normalizedStart,
      duration
    );
    if (!slotOk) {
      return res.status(409).json({
        success: false,
        message: 'Selected slot is no longer available',
        data: {},
      });
    }

    const endTime = addMinutesToClock(normalizedStart, duration);
    if (!endTime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startTime format — use HH:mm',
        data: {},
      });
    }

    const overlaps = await bookingOverlapsBlockingAppointment(
      appointment.business,
      parsedDate,
      normalizedStart,
      endTime,
      appointment._id
    );
    if (overlaps) {
      return res.status(409).json({
        success: false,
        message: 'Selected slot conflicts with another booking',
        data: {},
      });
    }

    appointment.date = utcStartOfDay(parsedDate);
    appointment.startTime = normalizedStart;
    appointment.endTime = endTime;
    appointment.status = 'pending';
    appointment.cancelledAt = null;
    appointment.cancelledBy = null;
    appointment.reminderSent = false;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'business', select: 'name category location phone' })
      .populate({ path: 'client', select: 'name email phone' });

    sendAppointmentReschedule(populated).catch((err) =>
      console.error('[notify] reschedule', err.message)
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled',
      data: { appointment: populated },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not reschedule appointment',
      data: {},
    });
  }
};
