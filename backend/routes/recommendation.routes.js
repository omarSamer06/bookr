import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { getRecommendations } from '../controllers/recommendation.controller.js';

const router = express.Router();

router.get('/', protect, restrictTo('client'), getRecommendations);

export default router;

