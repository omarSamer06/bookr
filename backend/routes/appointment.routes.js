import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import {
  cancelAppointment,
  createAppointment,
  getAppointmentById,
  getAvailableSlotsHandler,
  getBusinessAppointments,
  getMyAppointments,
  rescheduleAppointment,
  updateAppointmentStatus,
} from '../controllers/appointment.controller.js';

const router = express.Router();

router.get('/slots', getAvailableSlotsHandler);

router.post('/', protect, restrictTo('client'), createAppointment);
router.get('/my', protect, restrictTo('client'), getMyAppointments);
router.patch('/:id/reschedule', protect, restrictTo('client'), rescheduleAppointment);

router.get('/business', protect, restrictTo('owner'), getBusinessAppointments);
router.patch('/:id/status', protect, restrictTo('owner'), updateAppointmentStatus);

router.patch('/:id/cancel', protect, restrictTo('client', 'owner'), cancelAppointment);

router.get('/:id', protect, restrictTo('client', 'owner'), getAppointmentById);

export default router;
