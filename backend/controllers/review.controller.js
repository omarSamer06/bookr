import mongoose from 'mongoose';
import Review, { syncBusinessRatingStats } from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import Business from '../models/Business.js';

/** Recomputes denormalized rating fields on Business after review mutations */
async function findOwnedBusiness(ownerId) {
  return Business.findOne({ owner: ownerId });
}

/** Persists a client review tied to one completed appointment */
export const createReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(String(appointmentId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id',
        data: {},
      });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'rating must be an integer between 1 and 5',
        data: {},
      });
    }

    const trimmedComment = String(comment ?? '').trim();
    if (trimmedComment.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'comment must be at least 10 characters',
        data: {},
      });
    }
    if (trimmedComment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'comment must be at most 500 characters',
        data: {},
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
        data: {},
      });
    }

    if (appointment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own appointments',
        data: {},
      });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only review completed appointments',
        data: {},
      });
    }

    const existing = await Review.findOne({ appointment: appointment._id }).select('_id').lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A review already exists for this appointment',
        data: {},
      });
    }

    const review = await Review.create({
      business: appointment.business,
      client: req.user._id,
      appointment: appointment._id,
      rating: ratingNum,
      comment: trimmedComment,
    });

    const populated = await Review.findById(review._id)
      .populate({ path: 'client', select: 'name avatar' })
      .populate({ path: 'business', select: 'name category' })
      .populate({ path: 'appointment', select: 'date startTime status service' });

    return res.status(201).json({
      success: true,
      message: 'Review submitted',
      data: { review: populated },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A review already exists for this appointment',
        data: {},
      });
    }
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not create review',
      data: {},
    });
  }
};

/** Public paginated feed for a business detail page */
export const getBusinessReviews = async (req, res) => {
  try {
    const businessId = req.params.businessId ?? req.query.businessId;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    if (!mongoose.Types.ObjectId.isValid(String(businessId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business id',
        data: {},
      });
    }

    const business = await Business.findOne({ _id: businessId, isActive: true })
      .select('averageRating totalReviews name')
      .lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const filter = { business: businessId };
    const totalReviews = await Review.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalReviews / limit));
    const skip = (page - 1) * limit;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'client', select: 'name avatar' })
      .lean();

    const shaped = reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      ownerReply: r.ownerReply,
      clientId: r.client?._id?.toString?.() ?? String(r.client ?? ''),
      client: {
        name: r.client?.name ?? 'Client',
        avatar: r.client?.avatar ?? '',
      },
    }));

    return res.status(200).json({
      success: true,
      message: 'Reviews retrieved',
      data: {
        reviews: shaped,
        totalReviews: business.totalReviews ?? totalReviews,
        averageRating: business.averageRating ?? 0,
        currentPage: page,
        totalPages,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load reviews',
      data: {},
    });
  }
};

/** Owner posts a single public reply on a review for their business */
export const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(String(reviewId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review id',
        data: {},
      });
    }

    const trimmed = String(comment ?? '').trim();
    if (!trimmed) {
      return res.status(400).json({
        success: false,
        message: 'comment is required',
        data: {},
      });
    }
    if (trimmed.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'comment must be at most 1000 characters',
        data: {},
      });
    }

    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
        data: {},
      });
    }

    if (review.business.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only reply to reviews on your business',
        data: {},
      });
    }

    if (review.ownerReply?.comment) {
      return res.status(400).json({
        success: false,
        message: 'You have already replied to this review',
        data: {},
      });
    }

    review.ownerReply = {
      comment: trimmed,
      repliedAt: new Date(),
    };
    await review.save();

    const populated = await Review.findById(review._id)
      .populate({ path: 'client', select: 'name avatar' })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Reply posted',
      data: { review: populated },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not post reply',
      data: {},
    });
  }
};

/** Client removes their review and triggers rating recomputation */
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(reviewId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review id',
        data: {},
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      client: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
        data: {},
      });
    }

    const businessId = review.business;
    await review.deleteOne();
    await syncBusinessRatingStats(businessId);

    return res.status(200).json({
      success: true,
      message: 'Review deleted',
      data: {},
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not delete review',
      data: {},
    });
  }
};

/** Lists reviews authored by the authenticated client */
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ client: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'business', select: 'name category' })
      .populate({ path: 'appointment', select: 'date startTime service' })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Your reviews',
      data: { reviews },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load your reviews',
      data: {},
    });
  }
};

/** Owner inbox of reviews on their business (for replying) */
export const getOwnerBusinessReviews = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const filter = { business: business._id };
    const totalReviews = await Review.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalReviews / limit));
    const skip = (page - 1) * limit;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'client', select: 'name avatar' })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Business reviews',
      data: {
        reviews,
        totalReviews: business.totalReviews ?? totalReviews,
        averageRating: business.averageRating ?? 0,
        currentPage: page,
        totalPages,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load reviews',
      data: {},
    });
  }
};
