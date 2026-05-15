import { body, validationResult } from 'express-validator';

// Single gate keeps controllers free of repetitive validation branching
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: first.msg,
      data: { errors: errors.array() },
    });
  }
  next();
};

export const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['client', 'owner'])
    .withMessage('Role must be client or owner'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email').notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

export const validateUpdateProfile = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim(),
  handleValidationErrors,
];

export const validateUpdatePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  handleValidationErrors,
];
