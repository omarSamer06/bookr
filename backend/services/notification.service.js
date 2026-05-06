import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Business from '../models/Business.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import {
  cancellationTemplate,
  confirmationTemplate,
  reminderTemplate,
  rescheduleTemplate,
  sendEmail,
} from './email.service.js';
import {
  generateCancellationMessage,
  generateConfirmationMessage,
  generateReminderMessage,
} from './personalized.message.service.js';
import {
  cancellationSMS,
  confirmationSMS,
  reminderSMS,
  rescheduleSMS,
  sendSMS,
} from './sms.service.js';

/** Matches availability math so reminders fire on true UTC starts, not viewer timezones */
export function getAppointmentStartUtc(appointment) {
  const raw = appointment.date;
  const iso = raw instanceof Date ? raw.toISOString() : String(raw);
  const day = iso.slice(0, 10);
  const t = String(appointment.startTime || '').trim();
  const [hh = '00', mm = '00'] = t.split(':');
  return new Date(`${day}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00.000Z`);
}

/** One query with the joins templates need avoids N+1 fan-out per channel */
async function loadAppointmentForNotify(appointmentOrId) {
  let id = appointmentOrId;
  if (id && typeof id === 'object' && id._id) id = id._id;
  if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
  return Appointment.findById(id)
    .populate({ path: 'client', select: 'name email phone' })
    .populate({ path: 'business', select: 'name location phone website category' });
}

function buildContext(appt) {
  const clientName = appt.client?.name || 'there';
  const businessName = appt.business?.name || 'Business';
  const serviceName = appt.service?.name || 'Service';
  const iso = appt.date instanceof Date ? appt.date.toISOString() : String(appt.date);
  const dateStr = iso.slice(0, 10);
  const startTime = String(appt.startTime || '').trim();
  const price = appt.service?.price;
  const loc = appt.business?.location || {};
  const address = [loc.address, loc.city, loc.country].filter(Boolean).join(', ');
  const category = appt.business?.category || '';
  return { clientName, businessName, serviceName, dateStr, startTime, price, address, category };
}

/** Prefers email with SMS additive so Twilio gaps don’t block every client */
function resolveChannels(client) {
  const channels = [];
  if (client?.email) channels.push('email');
  if (client?.phone && String(client.phone).trim()) channels.push('sms');
  return channels;
}

async function persistNotification(payload) {
  return Notification.create({
    user: payload.userId,
    appointment: payload.appointmentId,
    type: payload.type,
    channel: payload.channel,
    subject: payload.subject,
    message: payload.message,
    status: payload.status,
    sentAt: payload.sentAt || new Date(),
  });
}

function buildEmailPayload(type, ctx) {
  switch (type) {
    case 'confirmation':
      return {
        subject: 'Your Bookr booking is confirmed',
        html: confirmationTemplate({
          clientName: ctx.clientName,
          businessName: ctx.businessName,
          serviceName: ctx.serviceName,
          date: ctx.dateStr,
          startTime: ctx.startTime,
          price: ctx.price,
        }),
      };
    case 'cancellation':
      return {
        subject: 'Appointment cancelled',
        html: cancellationTemplate({
          clientName: ctx.clientName,
          businessName: ctx.businessName,
          serviceName: ctx.serviceName,
          date: ctx.dateStr,
          startTime: ctx.startTime,
        }),
      };
    case 'reminder':
      return {
        subject: 'Reminder — upcoming Bookr appointment',
        html: reminderTemplate({
          clientName: ctx.clientName,
          businessName: ctx.businessName,
          serviceName: ctx.serviceName,
          date: ctx.dateStr,
          startTime: ctx.startTime,
          address: ctx.address,
        }),
      };
    case 'reschedule':
      return {
        subject: 'Your appointment time changed',
        html: rescheduleTemplate({
          clientName: ctx.clientName,
          businessName: ctx.businessName,
          serviceName: ctx.serviceName,
          newDate: ctx.dateStr,
          newStartTime: ctx.startTime,
        }),
      };
    default:
      return null;
  }
}

function buildSmsPayload(type, ctx) {
  switch (type) {
    case 'confirmation':
      return confirmationSMS({
        clientName: ctx.clientName,
        businessName: ctx.businessName,
        date: ctx.dateStr,
        startTime: ctx.startTime,
      });
    case 'cancellation':
      return cancellationSMS({
        clientName: ctx.clientName,
        businessName: ctx.businessName,
        date: ctx.dateStr,
        startTime: ctx.startTime,
      });
    case 'reminder':
      return reminderSMS({
        clientName: ctx.clientName,
        businessName: ctx.businessName,
        date: ctx.dateStr,
        startTime: ctx.startTime,
      });
    case 'reschedule':
      return rescheduleSMS({
        clientName: ctx.clientName,
        businessName: ctx.businessName,
        newDate: ctx.dateStr,
        newStartTime: ctx.startTime,
      });
    default:
      return '';
  }
}

/**
 * Orchestrates outbound channels without bubbling failures — HTTP handlers stay deterministic.
 */
export async function sendNotification({ userId, appointmentId, type, channels }) {
  try {
    const user = await User.findById(userId).select('name email phone');
    const appointment = await loadAppointmentForNotify(appointmentId);

    if (!user || !appointment || !appointment.client) {
      console.warn('[notification] skipped — missing user or appointment joins');
      return;
    }

    if (appointment.client._id.toString() !== user._id.toString()) {
      console.warn('[notification] skipped — client mismatch');
      return;
    }

    const ctx = buildContext(appointment);

    for (const channel of channels) {
      if (channel === 'email') {
        const mail = buildEmailPayload(type, ctx);
        if (!mail) continue;
        try {
          if (type === 'confirmation') {
            const aiText = await generateConfirmationMessage({
              clientName: ctx.clientName,
              businessName: ctx.businessName,
              serviceName: ctx.serviceName,
              date: ctx.dateStr,
              startTime: ctx.startTime,
              price: ctx.price,
            });
            mail.html = confirmationTemplate({
              clientName: ctx.clientName,
              businessName: ctx.businessName,
              serviceName: ctx.serviceName,
              date: ctx.dateStr,
              startTime: ctx.startTime,
              price: ctx.price,
            }).replace(
              /Your appointment with <strong>.*?<\/strong> is confirmed\./,
              aiText
            );
          }

          if (type === 'cancellation') {
            const aiText = await generateCancellationMessage({
              clientName: ctx.clientName,
              businessName: ctx.businessName,
              serviceName: ctx.serviceName,
              date: ctx.dateStr,
            });
            mail.html = cancellationTemplate({
              clientName: ctx.clientName,
              businessName: ctx.businessName,
              serviceName: ctx.serviceName,
              date: ctx.dateStr,
              startTime: ctx.startTime,
            }).replace(/has been <strong style="color:#ffb4b4;">cancelled<\/strong>\./, aiText);
          }

          if (type === 'reminder') {
            const aiText = await generateReminderMessage({
              clientName: ctx.clientName,
              businessName: ctx.businessName,
              serviceName: ctx.serviceName,
              date: ctx.dateStr,
              startTime: ctx.startTime,
              address: ctx.address,
              category: ctx.category,
            });
            mail.html = reminderTemplate({
              clientName: ctx.clientName,
              businessName: ctx.businessName,
              serviceName: ctx.serviceName,
              date: ctx.dateStr,
              startTime: ctx.startTime,
              address: ctx.address,
            }).replace(/Friendly reminder — you’re booked with <strong>.*?<\/strong> soon\./, aiText);
          }

          await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
          await persistNotification({
            userId,
            appointmentId,
            type,
            channel: 'email',
            subject: mail.subject,
            message: mail.subject,
            status: 'sent',
          });
        } catch (err) {
          console.error('[notification] email failed', err.message);
          await persistNotification({
            userId,
            appointmentId,
            type,
            channel: 'email',
            subject: mail.subject,
            message: String(err.message || 'email_failed').slice(0, 400),
            status: 'failed',
          });
        }
      }

      if (channel === 'sms') {
        const smsBody = buildSmsPayload(type, ctx);
        if (!smsBody) continue;
        try {
          await sendSMS({ to: user.phone, message: smsBody });
          await persistNotification({
            userId,
            appointmentId,
            type,
            channel: 'sms',
            subject: 'SMS',
            message: smsBody,
            status: 'sent',
          });
        } catch (err) {
          console.error('[notification] sms failed', err.message);
          await persistNotification({
            userId,
            appointmentId,
            type,
            channel: 'sms',
            subject: 'SMS',
            message: String(err.message || 'sms_failed').slice(0, 400),
            status: 'failed',
          });
        }
      }
    }
  } catch (err) {
    console.error('[notification] orchestration error', err.message);
  }
}

/** Confirmation piggybacks on appointment snapshots so pricing debates reference one truth */
export async function sendAppointmentConfirmation(appointmentOrId) {
  const appt = await loadAppointmentForNotify(appointmentOrId);
  if (!appt?.client) return;
  const channels = resolveChannels(appt.client);
  if (!channels.length) return;
  await sendNotification({
    userId: appt.client._id,
    appointmentId: appt._id,
    type: 'confirmation',
    channels,
  });
}

export async function sendAppointmentCancellation(appointmentOrId) {
  const appt = await loadAppointmentForNotify(appointmentOrId);
  if (!appt?.client) return;
  const channels = resolveChannels(appt.client);
  if (!channels.length) return;
  await sendNotification({
    userId: appt.client._id,
    appointmentId: appt._id,
    type: 'cancellation',
    channels,
  });
}

export async function sendAppointmentReminder(appointmentOrId) {
  const appt = await loadAppointmentForNotify(appointmentOrId);
  if (!appt?.client) return;
  const channels = resolveChannels(appt.client);
  if (!channels.length) return;
  await sendNotification({
    userId: appt.client._id,
    appointmentId: appt._id,
    type: 'reminder',
    channels,
  });
}

export async function sendAppointmentReschedule(appointmentOrId) {
  const appt = await loadAppointmentForNotify(appointmentOrId);
  if (!appt?.client) return;
  const channels = resolveChannels(appt.client);
  if (!channels.length) return;
  await sendNotification({
    userId: appt.client._id,
    appointmentId: appt._id,
    type: 'reschedule',
    channels,
  });
}

async function findOwnedBusiness(ownerId) {
  return Business.findOne({ owner: ownerId });
}

/** Mirrors appointment detail visibility so notification exports can’t leak across tenants */
export async function viewerMayAccessAppointment(user, appointmentId) {
  const appointment = await Appointment.findById(appointmentId).populate({
    path: 'business',
    select: 'owner',
  });
  if (!appointment) return { ok: false, code: 'NOT_FOUND' };

  const isClient = appointment.client.toString() === user._id.toString();
  let isOwner = false;
  if (user.role === 'owner') {
    const owned = await findOwnedBusiness(user._id);
    const bizId = appointment.business?._id ?? appointment.business;
    isOwner = owned && owned._id.toString() === bizId.toString();
  }

  if (!isClient && !isOwner) return { ok: false, code: 'FORBIDDEN' };
  return { ok: true };
}
