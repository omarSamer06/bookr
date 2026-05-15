import User from '../models/User.js';
import { generateToken } from '../services/token.service.js';
import {
  uploadImage,
  deleteImage as destroyCloudinaryImage,
  extractPublicIdFromUrl,
} from '../services/cloudinary.service.js';

const sanitizeUser = (userDoc) => {
  const obj = userDoc.toJSON ? userDoc.toJSON() : { ...userDoc };
  obj.hasPassword = Boolean(userDoc.password);
  delete obj.password;
  return obj;
};

const isCloudinaryAvatarUrl = (url) =>
  typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/');

export const register = async (req, res) => {
  try {
    const { name, email, password, role: roleFromBody } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        data: {},
      });
    }

    const role = roleFromBody === 'owner' ? 'owner' : 'client';

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    const token = generateToken(user._id.toString(), user.role);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        data: {},
      });
    }
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      data: {},
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        data: {},
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        data: {},
      });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        data: {},
      });
    }

    const token = generateToken(user._id.toString(), user.role);

    user.password = undefined;

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      data: {},
    });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.isActive) {
      const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(
        /\/$/,
        ''
      );
      return res.redirect(`${clientBase}/login?error=google_auth`);
    }

    const token = generateToken(user._id.toString(), user.role);
    const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(
      /\/$/,
      ''
    );
    // Query param avoids cookie/session coupling while SPA consumes token client-side
    return res.redirect(`${clientBase}?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error(err);
    const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(
      /\/$/,
      ''
    );
    return res.redirect(`${clientBase}/login?error=google_auth`);
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    return res.status(200).json({
      success: true,
      message: 'Current user',
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load profile',
      data: {},
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: 'Name is required',
          data: {},
        });
      }
      req.user.name = trimmed;
    }

    if (phone !== undefined) {
      req.user.phone = String(phone).trim();
    }

    await req.user.save();

    const fresh = await User.findById(req.user._id).select('+password');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: sanitizeUser(fresh),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not update profile',
      data: {},
    });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded',
        data: {},
      });
    }

    const previousAvatar = req.user.avatar;
    const avatarUrl = await uploadImage(req.file.path, 'bookr/avatars');

    if (previousAvatar && isCloudinaryAvatarUrl(previousAvatar)) {
      try {
        const publicId = extractPublicIdFromUrl(previousAvatar);
        await destroyCloudinaryImage(publicId);
      } catch {
        // Non-fatal: new avatar is already stored
      }
    }

    req.user.avatar = avatarUrl;
    await req.user.save();

    const fresh = await User.findById(req.user._id).select('+password');

    return res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        user: sanitizeUser(fresh),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not update avatar',
      data: {},
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user?.password) {
      return res.status(400).json({
        success: false,
        message: 'Password login is not enabled for this account',
        data: {},
      });
    }

    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        data: {},
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: {},
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not update password',
      data: {},
    });
  }
};
