import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import {
  getAppointmentsByPeriod,
  getBusiestHours,
  getClientStats,
  getOverviewStats,
  getRecentActivity,
  getServiceBreakdown,
} from '../controllers/analytics.controller.js';

const router = express.Router();

router.use(protect, restrictTo('owner'));

router.get('/overview', getOverviewStats);
router.get('/appointments-by-period', getAppointmentsByPeriod);
router.get('/service-breakdown', getServiceBreakdown);
router.get('/busiest-hours', getBusiestHours);
router.get('/client-stats', getClientStats);
router.get('/recent-activity', getRecentActivity);

export default router;

