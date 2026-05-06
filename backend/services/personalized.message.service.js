import { sendMessage as sendGroqMessage } from './groq.service.js';

function moneyLabel(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '—';
  return n === 0 ? 'free' : `$${n.toFixed(2)}`;
}

function fallbackConfirmation({ clientName, businessName, serviceName, date, startTime, price }) {
  return `Hi ${clientName}, your appointment with ${businessName} is confirmed for ${date} at ${startTime} (${serviceName}, ${moneyLabel(
    price
  )}). We’re looking forward to seeing you!`;
}

function fallbackReminder({ clientName, businessName, serviceName, date, startTime, address }) {
  const where = address ? ` at ${address}` : '';
  return `Hi ${clientName}, reminder: you’re booked with ${businessName} for ${serviceName} on ${date} at ${startTime}${where}. If anything changes, you can manage your booking in Bookr.`;
}

function fallbackCancellation({ clientName, businessName, serviceName, date }) {
  return `Hi ${clientName}, your ${serviceName} appointment with ${businessName} on ${date} has been cancelled. If you’d like, you can rebook anytime in Bookr.`;
}

function fallbackFollowUp({ clientName, businessName, serviceName }) {
  return `Hi ${clientName}, thanks for visiting ${businessName} for ${serviceName}. If you have a moment, we’d love your feedback — and you can book your next appointment anytime in Bookr.`;
}

function normalize(aiText, fallbackText) {
  const text = String(aiText || '').trim();
  if (!text) return fallbackText;
  return text.replace(/\s+/g, ' ').trim();
}

// AI providers can throttle or fail transiently; transactional notifications must always send.
async function safeGenerate({ systemPrompt, userPrompt, fallbackText }) {
  try {
    const reply = await sendGroqMessage({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return normalize(reply, fallbackText);
  } catch (err) {
    console.error('[personalized.message] Groq failed, using fallback:', err.message);
    return fallbackText;
  }
}

export async function generateConfirmationMessage({
  clientName,
  businessName,
  serviceName,
  date,
  startTime,
  price,
}) {
  const fallbackText = fallbackConfirmation({ clientName, businessName, serviceName, date, startTime, price });
  return safeGenerate({
    systemPrompt:
      'You are a friendly booking assistant. Write a short 2–3 sentence appointment confirmation. Be warm and personal. Mention the client by name, include the appointment details naturally, and end with something encouraging.',
    userPrompt: `Write a confirmation message for:
- Client: ${clientName}
- Business: ${businessName}
- Service: ${serviceName}
- Date: ${date}
- Time: ${startTime}
- Price: ${moneyLabel(price)}

Constraints:
- 2–3 sentences
- No emojis
- Do not invent any details.`,
    fallbackText,
  });
}

export async function generateReminderMessage({
  clientName,
  businessName,
  serviceName,
  date,
  startTime,
  address,
  category,
}) {
  const fallbackText = fallbackReminder({ clientName, businessName, serviceName, date, startTime, address });
  const prepHint = category ? `Business category: ${category}` : 'Business category: unknown';
  return safeGenerate({
    systemPrompt:
      'You are a friendly booking assistant. Write a short 2–3 sentence reminder message for an upcoming appointment. Be warm and helpful. If relevant to the service or category, mention a simple preparation suggestion (e.g., arrive early, bring ID, wear comfortable clothing).',
    userPrompt: `Write a reminder message for:
- Client: ${clientName}
- Business: ${businessName}
- Service: ${serviceName}
- Date: ${date}
- Time: ${startTime}
- Address: ${address || 'not provided'}
- ${prepHint}

Constraints:
- 2–3 sentences
- No emojis
- If prep advice is not clearly relevant, skip it
- Do not invent details.`,
    fallbackText,
  });
}

export async function generateCancellationMessage({ clientName, businessName, serviceName, date }) {
  const fallbackText = fallbackCancellation({ clientName, businessName, serviceName, date });
  return safeGenerate({
    systemPrompt:
      'You are a friendly booking assistant. Write a short 2–3 sentence cancellation message. Be sympathetic, acknowledge the cancellation, and invite the client to rebook.',
    userPrompt: `Write a cancellation message for:
- Client: ${clientName}
- Business: ${businessName}
- Service: ${serviceName}
- Date: ${date}

Constraints:
- 2–3 sentences
- No emojis
- Do not invent details.`,
    fallbackText,
  });
}

export async function generateFollowUpMessage({ clientName, businessName, serviceName }) {
  const fallbackText = fallbackFollowUp({ clientName, businessName, serviceName });
  return safeGenerate({
    systemPrompt:
      'You are a friendly booking assistant. Write a short 2–3 sentence follow-up message sent after a completed appointment. Thank the client, ask for feedback, and invite them to book again.',
    userPrompt: `Write a follow-up message for:
- Client: ${clientName}
- Business: ${businessName}
- Service: ${serviceName}

Constraints:
- 2–3 sentences
- No emojis
- Do not invent details.`,
    fallbackText,
  });
}

