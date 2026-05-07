import sgMail from '@sendgrid/mail';

/** Centralizes verified sender identity so transactional mail can’t spoof arbitrary domains */
function ensureSendGrid() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    throw new Error('SendGrid is not configured');
  }
  sgMail.setApiKey(key);
}

/** Generic mailer wraps SendGrid failures with logs for retries without crashing request paths */
export async function sendEmail({ to, subject, html }) {
  ensureSendGrid();
  const from = process.env.FROM_EMAIL;
  if (!from) {
    throw new Error('FROM_EMAIL is not configured');
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[email] sending', { to, subject });
  }

  try {
    await sgMail.send({
      to,
      from,
      subject,
      html,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] sent', { to });
    }
  } catch (error) {
    console.error('[email] SendGrid error:', error?.response?.body || error?.message || error);
    throw error;
  }
}

/** Shared Bookr chrome keeps multi-template mailings visually consistent */
function emailShell({ title, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0b0f14;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e8eaef;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0f14;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#121826;border-radius:16px;border:1px solid #1f2a3d;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#f4f7ff;">Bookr</div>
                <div style="margin-top:6px;font-size:13px;color:#8b98b3;">Booking, simplified.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px 28px;">
                <div style="height:1px;background:#1f2a3d;margin:8px 0 20px 0;"></div>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px 28px;font-size:12px;color:#6b778c;line-height:1.5;">
                You’re receiving this because of activity on your Bookr account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function moneyLabel(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  return n === 0 ? 'Free' : `$${n.toFixed(2)}`;
}

/** Confirmation copy reassures clients the slot and price snapshot are locked in */
export function confirmationTemplate({
  clientName,
  businessName,
  serviceName,
  date,
  startTime,
  price,
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#e8eaef;">
      Hi <strong>${escapeHtml(clientName)}</strong>,
    </p>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#c7d2e5;">
      Your appointment with <strong>${escapeHtml(businessName)}</strong> is confirmed.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f1624;border-radius:12px;border:1px solid #1f2a3d;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#8b98b3;">Service</td><td style="padding:14px 16px;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(serviceName)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:13px;color:#8b98b3;">Date</td><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(date)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:13px;color:#8b98b3;">Time</td><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(startTime)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:13px;color:#8b98b3;">Price</td><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(moneyLabel(price))}</td></tr>
    </table>
  `;
  return emailShell({ title: 'Booking confirmed', bodyHtml });
}

/** Cancellation notices should read as definitive without sounding like marketing */
export function cancellationTemplate({ clientName, businessName, serviceName, date, startTime }) {
  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#e8eaef;">
      Hi <strong>${escapeHtml(clientName)}</strong>,
    </p>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#c7d2e5;">
      The following appointment with <strong>${escapeHtml(businessName)}</strong> has been <strong style="color:#ffb4b4;">cancelled</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f1624;border-radius:12px;border:1px solid #1f2a3d;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#8b98b3;">Service</td><td style="padding:14px 16px;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(serviceName)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:13px;color:#8b98b3;">Was scheduled</td><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(date)} · ${escapeHtml(startTime)}</td></tr>
    </table>
  `;
  return emailShell({ title: 'Appointment cancelled', bodyHtml });
}

/** Reminder layout foregrounds address so transit planning is one glance away */
export function reminderTemplate({
  clientName,
  businessName,
  serviceName,
  date,
  startTime,
  address,
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#e8eaef;">
      Hi <strong>${escapeHtml(clientName)}</strong>,
    </p>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#c7d2e5;">
      Friendly reminder — you’re booked with <strong>${escapeHtml(businessName)}</strong> soon.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f1624;border-radius:12px;border:1px solid #1f2a3d;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#8b98b3;">Service</td><td style="padding:14px 16px;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(serviceName)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:13px;color:#8b98b3;">When</td><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(date)} · ${escapeHtml(startTime)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:13px;color:#8b98b3;">Where</td><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(address || 'See your Bookr invite or contact the business')}</td></tr>
    </table>
  `;
  return emailShell({ title: 'Upcoming appointment', bodyHtml });
}

/** Reschedule emails highlight only the new slot to avoid confusing old vs new rows */
export function rescheduleTemplate({
  clientName,
  businessName,
  serviceName,
  newDate,
  newStartTime,
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#e8eaef;">
      Hi <strong>${escapeHtml(clientName)}</strong>,
    </p>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#c7d2e5;">
      Your appointment with <strong>${escapeHtml(businessName)}</strong> has a new time.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f1624;border-radius:12px;border:1px solid #1f2a3d;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#8b98b3;">Service</td><td style="padding:14px 16px;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(serviceName)}</td></tr>
      <tr><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:13px;color:#8b98b3;">New schedule</td><td style="padding:14px 16px;border-top:1px solid #1f2a3d;font-size:14px;color:#e8eaef;text-align:right;">${escapeHtml(newDate)} · ${escapeHtml(newStartTime)}</td></tr>
    </table>
    <p style="margin:18px 0 0 0;font-size:13px;line-height:1.6;color:#8b98b3;">
      The booking is back in a pending state until the business confirms again.
    </p>
  `;
  return emailShell({ title: 'Appointment rescheduled', bodyHtml });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
