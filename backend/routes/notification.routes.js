import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getAppointmentNotifications, getMyNotifications } from '../controllers/notification.controller.js';

const router = express.Router();

router.get('/my', protect, getMyNotifications);
router.get('/appointment/:appointmentId', protect, getAppointmentNotifications);

export default router;
