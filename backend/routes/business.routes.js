import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { attachBusiness } from '../middleware/business.middleware.js';
import { uploadMultiple, wrapMulter } from '../middleware/upload.middleware.js';
import {
  createBusiness,
  getMyBusiness,
  updateBusiness,
  uploadImages,
  deleteImage,
  addService,
  updateService,
  deleteService,
  getAllBusinesses,
  getBusinessById,
} from '../controllers/business.controller.js';

const router = express.Router();

router.get('/', getAllBusinesses);

router.get('/me', protect, restrictTo('owner'), attachBusiness, getMyBusiness);
router.patch('/me', protect, restrictTo('owner'), attachBusiness, updateBusiness);
router.post(
  '/me/images',
  protect,
  restrictTo('owner'),
  attachBusiness,
  wrapMulter(uploadMultiple),
  uploadImages
);
router.delete('/me/images', protect, restrictTo('owner'), attachBusiness, deleteImage);
router.post('/me/services', protect, restrictTo('owner'), attachBusiness, addService);
router.patch('/me/services/:serviceId', protect, restrictTo('owner'), attachBusiness, updateService);
router.delete('/me/services/:serviceId', protect, restrictTo('owner'), attachBusiness, deleteService);

router.post('/', protect, restrictTo('owner'), createBusiness);

router.get('/:id', getBusinessById);

export default router;
