import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import { getAppointmentStartUtc, sendAppointmentReminder } from '../services/notification.service.js';

/**
 * Hourly ticks guarantee we intersect the rolling “next 24h” window even if the process restarts mid-day,
 * whereas a single daily cron could skip entire cohorts whenever deploys shift clock alignment.
 */
export function registerReminderCron() {
  cron.schedule(
    '0 * * * *',
    async () => {
      try {
        const candidates = await Appointment.find({
          status: 'confirmed',
          reminderSent: false,
        })
          .select('_id date startTime')
          .limit(800);

        const now = Date.now();
        const horizon = now + 24 * 60 * 60 * 1000;

        let dispatched = 0;

        for (const row of candidates) {
          const startMs = getAppointmentStartUtc(row).getTime();
          if (!Number.isFinite(startMs)) continue;
          if (startMs <= now || startMs > horizon) continue;

          await sendAppointmentReminder(row._id);
          await Appointment.updateOne({ _id: row._id }, { $set: { reminderSent: true } });
          dispatched += 1;
        }

        console.log(`[reminder.job] hour tick — reminders dispatched: ${dispatched}`);
      } catch (err) {
        console.error('[reminder.job]', err.message);
      }
    },
    { timezone: process.env.CRON_TIMEZONE || 'UTC' }
  );

  console.log('[reminder.job] registered (0 * * * * UTC)');
}
