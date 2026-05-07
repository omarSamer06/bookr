import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Sends chat messages to Groq without ever returning secrets to the caller.
 * Groq is OpenAI-compatible, and the SDK wraps the same chat.completions contract.
 */
export async function sendMessage({ messages, systemPrompt }) {
  try {
    if (!process.env.GROQ_API_KEY) {
      const err = new Error('GROQ_API_KEY is not configured');
      err.statusCode = 500;
      throw err;
    }

    const payload = [];
    if (systemPrompt) payload.push({ role: 'system', content: String(systemPrompt) });
    payload.push(...(messages || []));

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: payload,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content ?? '';
    return String(text).trim();
  } catch (err) {
    const details = err?.response?.data ?? err?.message ?? err;
    console.error('[groq] chat completion failed:', details);
    const safe = new Error('Chatbot is temporarily unavailable. Please try again in a moment.');
    safe.statusCode = 502;
    throw safe;
  }
}

