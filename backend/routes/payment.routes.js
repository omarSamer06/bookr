import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { createPaymentIntent, handleWebhook, refundPayment } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/create-intent', protect, restrictTo('client'), createPaymentIntent);
router.post('/refund/:appointmentId', protect, restrictTo('owner'), refundPayment);

export default router;
export { handleWebhook };
