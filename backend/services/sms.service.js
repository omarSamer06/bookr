import twilio from 'twilio';

let twilioClient;

/** Singleton client prevents connection churn during bursty reminder windows */
function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error('Twilio is not configured');
  }
  if (!twilioClient) {
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
}

/** Normalizes locals to E.164 using a default country when users omit + */
function normalizeE164(raw) {
  const trimmed = String(raw ?? '').trim().replace(/[\s()-]/g, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const cc = String(process.env.TWILIO_DEFAULT_COUNTRY_CODE || '1').replace(/^\+/, '');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return `+${cc}${digits}`;
}

/** Thin wrapper surfaces Twilio rejections upstream for per-channel bookkeeping */
export async function sendSMS({ to, message }) {
  const client = getTwilio();
  const from = process.env.TWILIO_PHONE;
  if (!from) {
    throw new Error('TWILIO_PHONE is not configured');
  }
  const dest = normalizeE164(to);
  if (!dest) {
    throw new Error('Invalid SMS destination');
  }

  await client.messages.create({
    body: message,
    from,
    to: dest,
  });
}

function clip160(text) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length <= 160 ? t : `${t.slice(0, 157)}...`;
}

/** SMS confirmation stays under segment limits so Twilio billing stays predictable */
export function confirmationSMS({ clientName, businessName, date, startTime }) {
  return clip160(
    `Bookr: Hi ${shortName(clientName)} — ${shortBiz(businessName)} confirmed you for ${date} ${startTime}.`
  );
}

export function cancellationSMS({ clientName, businessName, date, startTime }) {
  return clip160(
    `Bookr: Hi ${shortName(clientName)} — visit with ${shortBiz(businessName)} on ${date} ${startTime} was cancelled.`
  );
}

export function reminderSMS({ clientName, businessName, date, startTime }) {
  return clip160(
    `Bookr reminder: ${shortName(clientName)}, ${shortBiz(businessName)} tomorrow-ish: ${date} ${startTime}.`
  );
}

export function rescheduleSMS({ clientName, businessName, newDate, newStartTime }) {
  return clip160(
    `Bookr: ${shortName(clientName)}, ${shortBiz(businessName)} moved you to ${newDate} ${newStartTime} (pending).`
  );
}

function shortName(name) {
  const n = String(name || 'there').trim();
  return n.length > 18 ? `${n.slice(0, 17)}…` : n;
}

function shortBiz(name) {
  const n = String(name || 'Business').trim();
  return n.length > 22 ? `${n.slice(0, 21)}…` : n;
}
