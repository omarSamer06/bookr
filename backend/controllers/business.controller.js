import mongoose from 'mongoose';
import fs from 'fs/promises';
import Business, { businessCategories, businessPaymentModes } from '../models/Business.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import {
  uploadImage,
  deleteImage as destroyCloudinaryImage,
  extractPublicIdFromUrl,
} from '../services/cloudinary.service.js';

const MAX_TOTAL_IMAGES = 5;

async function unlinkDiskFiles(files) {
  await Promise.all(
    (files || []).map((f) => fs.unlink(f.path).catch(() => {}))
  );
}

export const createBusiness = async (req, res) => {
  try {
    const existing = await Business.findOne({ owner: req.user._id });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You already have a business registered',
        data: {},
      });
    }

    const { name, description, category, location, phone, workingHours, breaks, slotDuration } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required',
        data: {},
      });
    }

    if (!businessCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${businessCategories.join(', ')}`,
        data: {},
      });
    }

    let resolvedSlot = 30;
    if (slotDuration !== undefined) {
      const n = Number(slotDuration);
      if (Number.isNaN(n) || n < 5 || n > 480) {
        return res.status(400).json({
          success: false,
          message: 'slotDuration must be between 5 and 480 minutes',
          data: {},
        });
      }
      resolvedSlot = n;
    }

    const business = await Business.create({
      owner: req.user._id,
      name: name.trim(),
      description: description?.trim() ?? '',
      category,
      location: location ?? {},
      phone: phone?.trim() ?? '',
      workingHours: workingHours ?? {},
      breaks: breaks ?? [],
      slotDuration: resolvedSlot,
    });

    return res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: { business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not create business',
      data: {},
    });
  }
};

export const getMyBusiness = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Your business',
      data: { business: req.business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load business',
      data: {},
    });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const business = req.business;
    const {
      name,
      description,
      category,
      location,
      phone,
      paymentMode,
      cancellationPolicy,
      workingHours,
      breaks,
      slotDuration,
      isActive,
    } = req.body;

    if (name !== undefined) business.name = String(name).trim();
    if (description !== undefined) business.description = String(description).trim();
    if (category !== undefined) {
      if (!businessCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Category must be one of: ${businessCategories.join(', ')}`,
          data: {},
        });
      }
      business.category = category;
    }
    if (location !== undefined) {
      Object.assign(business.location, location);
    }
    if (phone !== undefined) business.phone = String(phone).trim();
    if (paymentMode !== undefined) {
      if (!businessPaymentModes.includes(String(paymentMode))) {
        return res.status(400).json({
          success: false,
          message: `paymentMode must be one of: ${businessPaymentModes.join(', ')}`,
          data: {},
        });
      }
      business.paymentMode = String(paymentMode);
    }
    if (cancellationPolicy !== undefined) {
      const cp = cancellationPolicy;
      if (cp.allowed !== undefined) {
        business.cancellationPolicy.allowed = Boolean(cp.allowed);
      }
      if (cp.hoursBeforeAppointment !== undefined) {
        const h = Number(cp.hoursBeforeAppointment);
        if (Number.isNaN(h) || h < 1 || h > 168) {
          return res.status(400).json({
            success: false,
            message: 'hoursBeforeAppointment must be between 1 and 168',
            data: {},
          });
        }
        business.cancellationPolicy.hoursBeforeAppointment = h;
      }
      if (cp.description !== undefined) {
        business.cancellationPolicy.description = String(cp.description).trim();
      } else if (business.cancellationPolicy.allowed) {
        const hrs = business.cancellationPolicy.hoursBeforeAppointment ?? 24;
        business.cancellationPolicy.description = `Cancellations must be made at least ${hrs} hours before the appointment`;
      }
    }
    if (workingHours !== undefined) business.workingHours = workingHours;
    if (breaks !== undefined) business.breaks = breaks;
    if (slotDuration !== undefined) {
      const n = Number(slotDuration);
      if (Number.isNaN(n) || n < 5 || n > 480) {
        return res.status(400).json({
          success: false,
          message: 'slotDuration must be between 5 and 480 minutes',
          data: {},
        });
      }
      business.slotDuration = n;
    }
    if (isActive !== undefined) business.isActive = Boolean(isActive);

    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      data: { business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not update business',
      data: {},
    });
  }
};

export const uploadImages = async (req, res) => {
  try {
    const files = req.files;
    if (!files?.length) {
      return res.status(400).json({
        success: false,
        message: 'No image files uploaded',
        data: {},
      });
    }

    const business = req.business;
    const slotsLeft = MAX_TOTAL_IMAGES - business.images.length;
    if (slotsLeft <= 0) {
      await unlinkDiskFiles(files);
      return res.status(400).json({
        success: false,
        message: `Maximum of ${MAX_TOTAL_IMAGES} images allowed`,
        data: {},
      });
    }

    if (files.length > slotsLeft) {
      await unlinkDiskFiles(files);
      return res.status(400).json({
        success: false,
        message: `You can upload only ${slotsLeft} more image(s)`,
        data: {},
      });
    }

    const urls = [];
    for (const file of files) {
      urls.push(await uploadImage(file.path));
    }

    business.images.push(...urls);
    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { business },
    });
  } catch (err) {
    console.error(err);
    await unlinkDiskFiles(req.files);
    return res.status(500).json({
      success: false,
      message: 'Could not upload images',
      data: {},
    });
  }
};

/** Skips Cloudinary because externally hosted URLs do not require upload or storage duplication */
export const addImageByUrl = async (req, res) => {
  try {
    const { url } = req.body || {};
    const business = req.business;

    const normalized = typeof url === 'string' ? url.trim() : '';
    if (!normalized || (!normalized.startsWith('http://') && !normalized.startsWith('https://'))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL',
        data: {},
      });
    }

    if ((business.images ?? []).length >= MAX_TOTAL_IMAGES) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed',
        data: {},
      });
    }

    if ((business.images ?? []).includes(normalized)) {
      return res.status(400).json({
        success: false,
        message: 'Image URL already added',
        data: {},
      });
    }

    business.images.push(normalized);
    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Image added successfully',
      data: { business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not add image',
      data: {},
    });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required',
        data: {},
      });
    }

    const business = req.business;
    const idx = business.images.indexOf(url);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found on this business',
        data: {},
      });
    }

    let publicId;
    try {
      publicId = extractPublicIdFromUrl(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid Cloudinary image URL',
        data: {},
      });
    }

    await destroyCloudinaryImage(publicId).catch(() => {});
    business.images.splice(idx, 1);
    await business.save();

    return res.status(200).json({
      success: true,
      message: 'Image removed successfully',
      data: { business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not delete image',
      data: {},
    });
  }
};

/** Hard-delete owner business and all dependent rows so no orphaned bookings remain */
export const deleteBusiness = async (req, res) => {
  try {
    const business = req.business;

    const appointmentIds = (
      await Appointment.find({ business: business._id }).select('_id').lean()
    ).map((a) => a._id);

    if (appointmentIds.length) {
      await Notification.deleteMany({ appointment: { $in: appointmentIds } });
      await Appointment.deleteMany({ _id: { $in: appointmentIds } });
    }

    const urls = business.images ?? [];
    await Promise.all(
      urls.map(async (url) => {
        try {
          const publicId = extractPublicIdFromUrl(url);
          await destroyCloudinaryImage(publicId).catch(() => {});
        } catch {
          // Ignore non-Cloudinary URLs; deletion should still proceed.
        }
      })
    );

    await Business.deleteOne({ _id: business._id });

    return res.status(200).json({
      success: true,
      message: 'Business deleted successfully',
      data: {},
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not delete business',
      data: {},
    });
  }
};

export const addService = async (req, res) => {
  try {
    const { name, description, duration, price, isActive } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required',
        data: {},
      });
    }

    const dur = Number(duration);
    const pr = Number(price);
    if (Number.isNaN(dur) || dur < 1) {
      return res.status(400).json({
        success: false,
        message: 'duration must be a positive number (minutes)',
        data: {},
      });
    }
    if (Number.isNaN(pr) || pr < 0) {
      return res.status(400).json({
        success: false,
        message: 'price must be a non-negative number',
        data: {},
      });
    }

    req.business.services.push({
      name: name.trim(),
      description: description?.trim() ?? '',
      duration: dur,
      price: pr,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await req.business.save();

    return res.status(201).json({
      success: true,
      message: 'Service added',
      data: { business: req.business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not add service',
      data: {},
    });
  }
};

export const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service id',
        data: {},
      });
    }

    const sub = req.business.services.id(serviceId);
    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        data: {},
      });
    }

    const { name, description, duration, price, isActive } = req.body;
    if (name !== undefined) sub.name = String(name).trim();
    if (description !== undefined) sub.description = String(description).trim();
    if (duration !== undefined) {
      const dur = Number(duration);
      if (Number.isNaN(dur) || dur < 1) {
        return res.status(400).json({
          success: false,
          message: 'duration must be a positive number (minutes)',
          data: {},
        });
      }
      sub.duration = dur;
    }
    if (price !== undefined) {
      const pr = Number(price);
      if (Number.isNaN(pr) || pr < 0) {
        return res.status(400).json({
          success: false,
          message: 'price must be a non-negative number',
          data: {},
        });
      }
      sub.price = pr;
    }
    if (isActive !== undefined) sub.isActive = Boolean(isActive);

    await req.business.save();

    return res.status(200).json({
      success: true,
      message: 'Service updated',
      data: { business: req.business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not update service',
      data: {},
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service id',
        data: {},
      });
    }

    const sub = req.business.services.id(serviceId);
    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        data: {},
      });
    }

    req.business.services.pull({ _id: serviceId });
    await req.business.save();

    return res.status(200).json({
      success: true,
      message: 'Service removed',
      data: { business: req.business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not delete service',
      data: {},
    });
  }
};

export const getAllBusinesses = async (req, res) => {
  try {
    const { category, city, search } = req.query;
    const filter = { isActive: true };

    if (category) {
      if (!businessCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category filter. Use one of: ${businessCategories.join(', ')}`,
          data: {},
        });
      }
      filter.category = category;
    }

    if (city && String(city).trim()) {
      filter['location.city'] = new RegExp(String(city).trim(), 'i');
    }

    if (search && String(search).trim()) {
      filter.$or = [
        { name: new RegExp(String(search).trim(), 'i') },
        { description: new RegExp(String(search).trim(), 'i') },
      ];
    }

    const businesses = await Business.find(filter)
      .populate({ path: 'owner', select: 'name avatar' })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Businesses retrieved',
      data: { businesses },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load businesses',
      data: {},
    });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business id',
        data: {},
      });
    }

    const business = await Business.findOne({ _id: id, isActive: true }).populate({
      path: 'owner',
      select: 'name avatar',
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Business retrieved',
      data: { business },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load business',
      data: {},
    });
  }
};
