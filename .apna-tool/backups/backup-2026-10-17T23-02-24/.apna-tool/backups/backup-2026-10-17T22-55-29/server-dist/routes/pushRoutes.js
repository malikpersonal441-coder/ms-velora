"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const zod_1 = require("zod");
const PushSubscription_1 = require("../models/PushSubscription");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const push_1 = require("../utils/push");
const router = (0, express_1.Router)();
const subscribeLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const subscriptionSchema = zod_1.z.object({
    endpoint: zod_1.z.string().url().max(1000).startsWith('https://'),
    keys: zod_1.z.object({
        p256dh: zod_1.z.string().min(10).max(200),
        auth: zod_1.z.string().min(8).max(100),
    }),
});
// GET /api/push/public-key — key the browser needs to create a subscription
router.get('/public-key', (_req, res) => {
    res.json({ success: true, enabled: push_1.pushEnabled, publicKey: push_1.vapidPublicKey });
});
// POST /api/push/subscribe — { subscription, topic: 'new-arrivals' | 'admin-orders' }
router.post('/subscribe', subscribeLimiter, auth_1.optionalAuth, async (req, res, next) => {
    try {
        if (!push_1.pushEnabled)
            throw new errorHandler_1.AppError('Notifications are not configured on this server.', 503);
        const { subscription, topic } = zod_1.z
            .object({ subscription: subscriptionSchema, topic: zod_1.z.enum(['new-arrivals', 'admin-orders']) })
            .parse(req.body);
        // Only the signed-in admin may receive order alerts
        if (topic === 'admin-orders' && req.user?.role !== 'admin') {
            throw new errorHandler_1.AppError('Only the store admin can receive order alerts.', 403);
        }
        await PushSubscription_1.PushSubscription.findOneAndUpdate({ endpoint: subscription.endpoint }, {
            $set: {
                keys: subscription.keys,
                userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
                ...(topic === 'admin-orders' ? { user: req.user._id } : {}),
            },
            $addToSet: { topics: topic },
        }, { upsert: true, new: true });
        res.json({ success: true, message: 'Notifications turned on.' });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/push/unsubscribe — { endpoint, topic }
router.post('/unsubscribe', subscribeLimiter, async (req, res, next) => {
    try {
        const { endpoint, topic } = zod_1.z
            .object({ endpoint: zod_1.z.string().url().max(1000), topic: zod_1.z.enum(['new-arrivals', 'admin-orders']) })
            .parse(req.body);
        const sub = await PushSubscription_1.PushSubscription.findOneAndUpdate({ endpoint }, { $pull: { topics: topic } }, { new: true });
        if (sub && sub.topics.length === 0)
            await sub.deleteOne();
        res.json({ success: true, message: 'Notifications turned off.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
