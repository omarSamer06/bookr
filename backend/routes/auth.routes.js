import express from 'express';
import passport from 'passport';
import {
  register,
  login,
  googleCallback,
  getMe,
  updateProfile,
  updateAvatar,
  updatePassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadSingle, wrapMulter } from '../middleware/upload.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateUpdatePassword,
} from '../middleware/validate.middleware.js';

const router = express.Router();

const googleFailureRedirect = () => {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/login?error=google_auth`;
};

// Avoids opaque Passport crashes when OAuth env isn't wired yet (local/dev without Google)
const requireGoogleOAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured',
      data: {},
    });
  }
  next();
};

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

router.get(
  '/google',
  requireGoogleOAuth,
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  requireGoogleOAuth,
  passport.authenticate('google', {
    session: false,
    failureRedirect: googleFailureRedirect(),
  }),
  googleCallback
);

router.get('/me', protect, getMe);
router.patch('/profile', protect, validateUpdateProfile, updateProfile);
router.patch('/avatar', protect, wrapMulter(uploadSingle), updateAvatar);
router.patch('/update-password', protect, validateUpdatePassword, updatePassword);

export default router;
