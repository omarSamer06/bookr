import mongoose from 'mongoose';

const notificationTypes = ['confirmation', 'reminder', 'cancellation', 'reschedule', 'followup', 'custom'];
const notificationChannels = ['email', 'sms'];
const notificationStatuses = ['sent', 'failed'];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: notificationTypes,
      required: true,
    },
    channel: {
      type: String,
      enum: notificationChannels,
      required: true,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: notificationStatuses,
      default: 'sent',
    },
    // Auditors sort by dispatch time independently of Mongo insert order
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

notificationSchema.index({ user: 1, sentAt: -1 });
notificationSchema.index({ appointment: 1, sentAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
export { notificationTypes, notificationChannels, notificationStatuses };
