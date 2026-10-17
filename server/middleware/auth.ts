import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models/User';

export interface JwtPayload {
  userId: string;
  role: 'customer' | 'admin';
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const AUTH_COOKIE_NAME = 'bfs_auth_token';

export function signAuthToken(user: IUser): string {
  const payload: JwtPayload = {
    userId: String(user._id),
    role: user.role,
    tokenVersion: user.tokenVersion || 0,
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    path: '/',
  });
}

function extractToken(req: Request): string | null {
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Session invalid. User no longer exists.' });
      return;
    }

    if (user.status === 'suspended') {
      clearAuthCookie(res);
      res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
      return;
    }

    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Session expired due to security update. Please sign in again.' });
      return;
    }

    req.user = user;
    next();
  } catch {
    clearAuthCookie(res);
    res.status(401).json({ success: false, message: 'Invalid or expired authentication session.' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (user && user.status === 'active' && (user.tokenVersion || 0) === (decoded.tokenVersion || 0)) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Administrator privileges are required to access this resource.',
    });
    return;
  }
  next();
}
