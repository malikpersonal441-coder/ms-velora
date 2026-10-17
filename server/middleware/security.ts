import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

function sanitizeObject(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Strip keys starting with '$' or containing '.' to prevent NoSQL operator injection
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleaned[key] = sanitizeObject(value);
    }
    return cleaned;
  }
  return obj;
}

export function sanitizeNoSqlInjection(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as Record<string, string>;
  }
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method) || req.path.includes('/webhooks/')) {
    return next();
  }

  // Allow requests with custom X-Requested-With header or matching Origin
  const requestedWith = req.headers['x-requested-with'];
  const origin = req.headers.origin;

  if (
    requestedWith === 'MSVelora-Client' ||
    env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.VITEST)
  ) {
    return next();
  }

  if (origin) {
    const allowedOrigins = [
      env.FRONTEND_URL,
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5001',
    ];
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL))
    ) {
      return next();
    }
    res.status(403).json({
      success: false,
      message: 'CSRF check failed: untrusted request origin.',
    });
    return;
  }

  next();
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Strict in production; relaxed locally where the admin, the store and tests share one IP
  max: env.NODE_ENV === 'production' ? 600 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
});
