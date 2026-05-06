import User from '../models/User.js';
import { verifyToken } from '../services/token.service.js';

// Allows guest access while still attaching a verified user when a Bearer token is present
export const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer')) return next();
    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return next();

    req.user = user;
    return next();
  } catch {
    return next();
  }
};

