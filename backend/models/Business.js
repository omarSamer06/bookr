import mongoose from 'mongoose';

const categories = ['beauty', 'healthcare', 'fitness', 'education', 'consulting', 'other'];
const paymentModes = ['online', 'on_arrival', 'both'];

const daySchema = new mongoose.Schema(
  {
    isOff: { type: Boolean, default: false },
    open: { type: String, default: '09:00' },
    close: { type: String, default: '17:00' },
  },
  { _id: false }
);

const weekendDayDefaults = () => ({
  isOff: true,
  open: '09:00',
  close: '17:00',
});

const weekdayDefaults = () => ({
  isOff: false,
  open: '09:00',
  close: '17:00',
});

const workingHoursSchema = new mongoose.Schema(
  {
    monday: { type: daySchema, default: weekdayDefaults },
    tuesday: { type: daySchema, default: weekdayDefaults },
    wednesday: { type: daySchema, default: weekdayDefaults },
    thursday: { type: daySchema, default: weekdayDefaults },
    friday: { type: daySchema, default: weekdayDefaults },
    saturday: { type: daySchema, default: weekendDayDefaults },
    sunday: { type: daySchema, default: weekendDayDefaults },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    duration: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: false }
);

const breakSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: categories,
      required: true,
    },
    services: [serviceSchema],
    workingHours: {
      type: workingHoursSchema,
      default: () => ({}),
    },
    breaks: [breakSchema],
    slotDuration: {
      type: Number,
      default: 30,
      min: 5,
      max: 480,
    },
    location: {
      type: locationSchema,
      default: () => ({}),
    },
    phone: { type: String, trim: true, default: '' },
    paymentMode: {
      type: String,
      enum: paymentModes,
      default: 'both',
    },
    images: [{ type: String }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: true },
  }
);

businessSchema.index({ category: 1, isActive: 1 });
businessSchema.index({ 'location.city': 1, isActive: 1 });

const Business = mongoose.model('Business', businessSchema);

export default Business;
export { categories as businessCategories, paymentModes as businessPaymentModes };
