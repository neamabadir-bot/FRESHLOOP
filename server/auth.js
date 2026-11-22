// Email + password authentication (spec section 4, first version).
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'freshloop-dev-secret-change-me';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[freshloop] JWT_SECRET is not set – using an insecure development secret.');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' });
}

/** Express middleware: requires "Authorization: Bearer <token>" and sets req.userId. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'not_authenticated' });
  try {
    req.userId = jwt.verify(token, SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
