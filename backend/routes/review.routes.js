import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import {
  createReview,
  deleteReview,
  getBusinessReviews,
  getMyReviews,
  getOwnerBusinessReviews,
  replyToReview,
} from '../controllers/review.controller.js';

const router = express.Router();

router.get('/business/:businessId', getBusinessReviews);
router.get('/my', protect, restrictTo('client'), getMyReviews);
router.get('/owner', protect, restrictTo('owner'), getOwnerBusinessReviews);
router.post('/', protect, restrictTo('client'), createReview);
router.patch('/:reviewId/reply', protect, restrictTo('owner'), replyToReview);
router.delete('/:reviewId', protect, restrictTo('client'), deleteReview);

export default router;
