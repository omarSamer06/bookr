import express from 'express';
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';
import { getSession, sendMessage, startSession } from '../controllers/chatbot.controller.js';

const router = express.Router();

router.post('/session', optionalAuth, startSession);
router.post('/message', optionalAuth, sendMessage);
router.get('/session/:sessionId', optionalAuth, getSession);

export default router;

