"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = exports.authRateLimiter = void 0;
exports.sanitizeNoSqlInjection = sanitizeNoSqlInjection;
exports.csrfProtection = csrfProtection;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
function sanitizeObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    if (obj !== null && typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
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
function sanitizeNoSqlInjection(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }
    next();
}
function csrfProtection(req, res, next) {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method) || req.path.includes('/webhooks/')) {
        return next();
    }
    // Allow requests with custom X-Requested-With header or matching Origin
    const requestedWith = req.headers['x-requested-with'];
    const origin = req.headers.origin;
    if (requestedWith === 'MSVelora-Client' ||
        env_1.env.NODE_ENV === 'test' ||
        process.env.NODE_ENV === 'test' ||
        Boolean(process.env.VITEST)) {
        return next();
    }
    if (origin) {
        const allowedOrigins = [
            env_1.env.FRONTEND_URL,
            'http://localhost:5174',
            'http://127.0.0.1:5174',
            'http://localhost:5001',
        ];
        if (allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL))) {
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
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
        return forwarded[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env_1.env.NODE_ENV === 'test' ? 1000 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    message: {
        success: false,
        message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
    },
});
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    // Strict in production; relaxed locally where the admin, the store and tests share one IP
    max: env_1.env.NODE_ENV === 'production' ? 600 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    message: {
        success: false,
        message: 'Too many requests from this IP. Please slow down.',
    },
});
