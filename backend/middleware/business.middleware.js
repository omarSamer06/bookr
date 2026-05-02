import Business from '../models/Business.js';

// Central lookup prevents repeating owner→business queries and keeps controllers thin
export const attachBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }
    req.business = business;
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load business',
      data: {},
    });
  }
};
