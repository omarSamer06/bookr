import mongoose from 'mongoose';
import ChatSession from '../models/ChatSession.js';
import Business from '../models/Business.js';
import { sendMessage as sendGroqMessage } from '../services/groq.service.js';
import {
  buildGuestSystemPrompt,
  buildSystemPrompt,
  formatConversationHistory,
} from '../services/chatbot.service.js';

function nowMessage(role, content) {
  return { role, content: String(content || '').trim(), timestamp: new Date() };
}

function welcomeText(business) {
  if (business?.name) {
    return `Hi! I’m your booking assistant for ${business.name}. Ask me about services, pricing, working hours, or how to book.`;
  }
  return `Hi! I’m the Bookr assistant. Ask me how booking works, payments, rescheduling, or how to find a business.`;
}

/** Creates a session so guests can keep context without authenticating */
export const startSession = async (req, res) => {
  try {
    const { businessId } = req.body || {};

    let business = null;
    let businessRef = null;

    if (businessId !== undefined && businessId !== null && String(businessId).trim()) {
      if (!mongoose.Types.ObjectId.isValid(String(businessId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid business id',
          data: {},
        });
      }
      business = await Business.findById(businessId).select('name isActive').lean();
      if (!business || business.isActive === false) {
        return res.status(404).json({
          success: false,
          message: 'Business not found',
          data: {},
        });
      }
      businessRef = business._id;
    }

    const welcome = welcomeText(business);

    const session = await ChatSession.create({
      user: req.user?._id ?? null,
      business: businessRef,
      messages: [nowMessage('assistant', welcome)],
    });

    return res.status(201).json({
      success: true,
      message: 'Chat session started',
      data: {
        sessionId: session._id,
        welcomeMessage: welcome,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not start chat session',
      data: {},
    });
  }
};

/** Persists conversation turns so the assistant stays grounded in prior user context */
export const sendMessage = async (req, res) => {
  try {
    const { sessionId, message } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(String(sessionId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session id',
        data: {},
      });
    }

    const userText = String(message || '').trim();
    if (!userText) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
        data: {},
      });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
        data: {},
      });
    }

    if (req.user && session.user && session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this chat session',
        data: {},
      });
    }

    session.messages.push(nowMessage('user', userText));

    let systemPrompt;
    if (session.business) {
      const built = await buildSystemPrompt(session.business);
      systemPrompt = built.systemPrompt;
    } else {
      systemPrompt = buildGuestSystemPrompt().systemPrompt;
    }

    const history = formatConversationHistory(session.messages);

    const assistantReply = await sendGroqMessage({
      systemPrompt,
      messages: history,
    });

    session.messages.push(nowMessage('assistant', assistantReply || ''));
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Message sent',
      data: {
        reply: assistantReply,
        session,
      },
    });
  } catch (err) {
    const status = err?.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    if (status >= 500) console.error(err);
    return res.status(status).json({
      success: false,
      message: err?.message || 'Could not send message',
      data: {},
    });
  }
};

/** Returns the full session transcript so the UI can rehydrate after refresh */
export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(sessionId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session id',
        data: {},
      });
    }

    const session = await ChatSession.findById(sessionId).lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
        data: {},
      });
    }

    if (req.user && session.user && session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this chat session',
        data: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat session retrieved',
      data: { session },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load chat session',
      data: {},
    });
  }
};

