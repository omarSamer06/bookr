import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../services/email.service.js';
import { generateFollowUpMessage } from '../services/personalized.message.service.js';

async function persistFollowUp({ userId, appointmentId, subject, message, status }) {
  return Notification.create({
    user: userId,
    appointment: appointmentId,
    type: 'followup',
    channel: 'email',
    subject,
    message,
    status,
    sentAt: new Date(),
  });
}

/**
 * Runs frequently to tolerate restarts while still hitting the 1-hour post-completion target window.
 */
export function registerFollowUpCron() {
  cron.schedule(
    '*/30 * * * *',
    async () => {
      try {
        const now = Date.now();
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
        const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000);

        const candidates = await Appointment.find({
          status: 'completed',
          followUpSent: false,
          completedAt: { $gte: twoHoursAgo, $lte: oneHourAgo },
        })
          .select('_id client business service completedAt')
          .populate({ path: 'client', select: 'name email' })
          .populate({ path: 'business', select: 'name' })
          .limit(500);

        let dispatched = 0;

        for (const appt of candidates) {
          const to = appt.client?.email;
          if (!to) {
            await Appointment.updateOne({ _id: appt._id }, { $set: { followUpSent: true } });
            continue;
          }

          const subject = 'Thanks for visiting — how was it?';
          const text = await generateFollowUpMessage({
            clientName: appt.client?.name || 'there',
            businessName: appt.business?.name || 'Bookr',
            serviceName: appt.service?.name || 'your appointment',
          });

          const html = `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.65;color:#e8eaef;">
              <p style="margin:0 0 14px 0;font-size:15px;color:#c7d2e5;">${String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')}</p>
              <p style="margin:0;font-size:13px;color:#8b98b3;">You can book again anytime in Bookr.</p>
            </div>
          `;

          try {
            await sendEmail({ to, subject, html });
            await persistFollowUp({
              userId: appt.client._id,
              appointmentId: appt._id,
              subject,
              message: text,
              status: 'sent',
            });
          } catch (err) {
            console.error('[followup.job] email failed', err.message);
            await persistFollowUp({
              userId: appt.client._id,
              appointmentId: appt._id,
              subject,
              message: String(err.message || 'email_failed').slice(0, 400),
              status: 'failed',
            });
          }

          await Appointment.updateOne({ _id: appt._id }, { $set: { followUpSent: true } });
          dispatched += 1;
        }

        console.log(`[followup.job] tick — follow-ups dispatched: ${dispatched}`);
      } catch (err) {
        console.error('[followup.job]', err.message);
      }
    },
    { timezone: process.env.CRON_TIMEZONE || 'UTC' }
  );

  console.log('[followup.job] registered (*/30 * * * * UTC)');
}

