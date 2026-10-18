"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vapidPublicKey = exports.pushEnabled = void 0;
exports.sendToTopic = sendToTopic;
require("../config/env"); // ensure .env is loaded before reading VAPID keys
const web_push_1 = __importDefault(require("web-push"));
const PushSubscription_1 = require("../models/PushSubscription");
const PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
exports.pushEnabled = Boolean(PUBLIC && PRIVATE);
exports.vapidPublicKey = PUBLIC;
if (exports.pushEnabled) {
    web_push_1.default.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
}
/**
 * Sends a notification to every device subscribed to `topic`.
 * Subscriptions the browser reports as gone (404/410) are deleted.
 * Never throws — a failed notification must not break an order or product save.
 */
async function sendToTopic(topic, payload) {
    if (!exports.pushEnabled)
        return { sent: 0, removed: 0 };
    let sent = 0;
    let removed = 0;
    try {
        const subs = await PushSubscription_1.PushSubscription.find({ topics: topic }).lean();
        const body = JSON.stringify({ icon: '/brand/icon-192.png', badge: '/brand/favicon-32.png', ...payload });
        await Promise.all(subs.map(async (s) => {
            try {
                await web_push_1.default.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 60 * 60 * 24 });
                sent++;
            }
            catch (err) {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                    await PushSubscription_1.PushSubscription.deleteOne({ _id: s._id });
                    removed++;
                }
                else {
                    console.warn('[push] send failed', err?.statusCode || err?.message);
                }
            }
        }));
    }
    catch (err) {
        console.warn('[push] topic send failed', err?.message);
    }
    return { sent, removed };
}
