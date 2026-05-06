import mongoose from 'mongoose';
import Business from '../models/Business.js';

function money(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return String(price ?? '');
  return `$${n.toFixed(2)}`;
}

function formatWorkingHours(workingHours) {
  const days = [
    ['monday', 'Monday'],
    ['tuesday', 'Tuesday'],
    ['wednesday', 'Wednesday'],
    ['thursday', 'Thursday'],
    ['friday', 'Friday'],
    ['saturday', 'Saturday'],
    ['sunday', 'Sunday'],
  ];

  return days
    .map(([key, label]) => {
      const d = workingHours?.[key];
      if (!d) return `- ${label}: unknown`;
      if (d.isOff) return `- ${label}: closed`;
      return `- ${label}: ${d.open}–${d.close}`;
    })
    .join('\n');
}

export async function buildSystemPrompt(businessId) {
  if (!mongoose.Types.ObjectId.isValid(String(businessId || ''))) {
    const err = new Error('Invalid business id');
    err.statusCode = 400;
    throw err;
  }

  const business = await Business.findById(businessId).lean();
  if (!business || business.isActive === false) {
    const err = new Error('Business not found');
    err.statusCode = 404;
    throw err;
  }

  const location = [business.location?.address, business.location?.city, business.location?.country]
    .filter(Boolean)
    .join(', ');

  const services = (business.services ?? [])
    .filter((s) => s && (s.isActive ?? true))
    .map((s) => `- ${s.name} — ${s.duration} min — ${money(s.price)}`)
    .join('\n');

  const prompt = [
    `You are a helpful booking assistant for ${business.name}.`,
    '',
    'Business info:',
    `- Name: ${business.name}`,
    `- Category: ${business.category}`,
    `- Description: ${business.description || '—'}`,
    `- Location: ${location || '—'}`,
    `- Phone: ${business.phone || '—'}`,
    '',
    'Services:',
    services || '- No services listed yet.',
    '',
    'Working hours:',
    formatWorkingHours(business.workingHours),
    '',
    'Instructions:',
    '- Only answer booking-related questions for this business (services, pricing, duration, hours, location, how to book).',
    '- Be friendly and concise.',
    '- If asked about availability, do not guess; tell the user to use the booking page to see live time slots.',
    '- Never make up information that is not provided above.',
  ].join('\n');

  return { systemPrompt: prompt, business };
}

export function buildGuestSystemPrompt() {
  const prompt = [
    'You are a helpful assistant for the Bookr booking platform.',
    '',
    'You can answer general questions about how Bookr works, including:',
    '- Browsing businesses and services',
    '- Booking an appointment and selecting a time slot',
    '- Payments and payment status',
    '- Managing appointments (reschedule, cancel)',
    '- Notifications',
    '',
    'Instructions:',
    '- Keep answers concise and friendly.',
    '- If a question is about a specific business, ask the user to open that business page so you can use its details.',
    '- Never make up business-specific details (pricing, hours, services) unless provided.',
  ].join('\n');

  return { systemPrompt: prompt };
}

export function formatConversationHistory(messages) {
  const safe = Array.isArray(messages) ? messages : [];
  return safe
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

