import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { viewerMayAccessAppointment } from '../services/notification.service.js';

/** Pulls only rows keyed to the JWT identity so browsing stays scoped per inbox */
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ sentAt: -1 })
      .limit(200)
      .populate({
        path: 'appointment',
        select: 'date startTime status service paymentStatus business',
        populate: { path: 'business', select: 'name' },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved',
      data: { notifications },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load notifications',
      data: {},
    });
  }
};

/** Threads timeline endpoints through appointment ACL reuse instead of inventing new RBAC strings */
export const getAppointmentNotifications = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(appointmentId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    const access = await viewerMayAccessAppointment(req.user, appointmentId);
    if (!access.ok) {
      const code = access.code === 'NOT_FOUND' ? 404 : 403;
      return res.status(code).json({
        success: false,
        message:
          access.code === 'NOT_FOUND'
            ? 'Appointment not found'
            : 'You do not have permission to view these notifications',
        data: {},
      });
    }

    const notifications = await Notification.find({ appointment: appointmentId })
      .sort({ sentAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Appointment notifications',
      data: { notifications },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load notifications',
      data: {},
    });
  }
};
