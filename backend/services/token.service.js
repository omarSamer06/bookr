import jwt from 'jsonwebtoken';

// Issues short-lived credentials without exposing refresh-token complexity until Phase 3+
export function generateToken(userId, role) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId, role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Shared verifier so middleware and jobs decode tokens identically
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, secret);
}
