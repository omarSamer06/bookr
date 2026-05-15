import mongoose from 'mongoose';
import Business from './Business.js';

const ownerReplySchema = new mongoose.Schema(
  {
    comment: { type: String, trim: true, default: '' },
    repliedAt: { type: Date, default: null },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
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
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    ownerReply: {
      type: ownerReplySchema,
      default: () => ({}),
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

reviewSchema.index({ business: 1, createdAt: -1 });

/** Recomputes denormalized rating fields on Business after review mutations */
async function syncBusinessRatingStats(businessId) {
  const id = businessId?._id ?? businessId;
  if (!id) return;

  const stats = await mongoose.model('Review').aggregate([
    { $match: { business: new mongoose.Types.ObjectId(String(id)) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const row = stats[0];
  const averageRating = row ? Math.round(row.averageRating * 10) / 10 : 0;
  const totalReviews = row?.totalReviews ?? 0;

  await Business.findByIdAndUpdate(id, { averageRating, totalReviews });
}

reviewSchema.post('save', async function syncAfterSave() {
  await syncBusinessRatingStats(this.business);
});

reviewSchema.post('deleteOne', { document: true, query: false }, async function syncAfterDelete() {
  await syncBusinessRatingStats(this.business);
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
export { syncBusinessRatingStats };
