import mongoose from 'mongoose';

const serviceSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const appointmentStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];
const paymentStatuses = ['unpaid', 'paid', 'refunded'];

const appointmentSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    service: {
      type: serviceSnapshotSchema,
      required: true,
    },
    // Calendar day anchor in UTC so listings sort/filter consistently across clients
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: appointmentStatuses,
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: paymentStatuses,
      default: 'unpaid',
    },
    paymentIntentId: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

appointmentSchema.index({ business: 1, date: 1 });
appointmentSchema.index(
  { paymentIntentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentIntentId: { $regex: /^pi_/ },
    },
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
export { appointmentStatuses, paymentStatuses };
