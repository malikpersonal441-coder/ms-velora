"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_COOKIE_NAME = void 0;
exports.signAuthToken = signAuthToken;
exports.setAuthCookie = setAuthCookie;
exports.clearAuthCookie = clearAuthCookie;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
exports.AUTH_COOKIE_NAME = 'bfs_auth_token';
function signAuthToken(user) {
    const payload = {
        userId: String(user._id),
        role: user.role,
        tokenVersion: user.tokenVersion || 0,
    };
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
        expiresIn: env_1.env.JWT_EXPIRES_IN,
    });
}
function setAuthCookie(res, token) {
    res.cookie(exports.AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env_1.env.COOKIE_SECURE,
        sameSite: env_1.env.COOKIE_SECURE ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
    });
}
function clearAuthCookie(res) {
    res.clearCookie(exports.AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: env_1.env.COOKIE_SECURE,
        sameSite: env_1.env.COOKIE_SECURE ? 'none' : 'lax',
        path: '/',
    });
}
function extractToken(req) {
    if (req.cookies && req.cookies[exports.AUTH_COOKIE_NAME]) {
        return req.cookies[exports.AUTH_COOKIE_NAME];
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}
async function requireAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await User_1.User.findById(decoded.userId);
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
    }
    catch {
        clearAuthCookie(res);
        res.status(401).json({ success: false, message: 'Invalid or expired authentication session.' });
    }
}
async function optionalAuth(req, _res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await User_1.User.findById(decoded.userId);
        if (user && user.status === 'active' && (user.tokenVersion || 0) === (decoded.tokenVersion || 0)) {
            req.user = user;
        }
        next();
    }
    catch {
        next();
    }
}
function requireAdmin(req, res, next) {
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
