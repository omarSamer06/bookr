import User from '../models/User.js';
import { verifyToken } from '../services/token.service.js';

// JWT gate: attaches the live DB user so role/active checks can't be spoofed from stale claims alone
export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — token missing',
        data: {},
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
        data: {},
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid token',
      data: {},
    });
  }
};

// Keeps privileged routes declarative instead of scattering role checks across controllers
export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        data: {},
      });
    }
    next();
  };
