import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { PushSubscription } from '../models/PushSubscription';
import { optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { pushEnabled, vapidPublicKey } from '../utils/push';

const router = Router();

const subscribeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).startsWith('https://'),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(8).max(100),
  }),
});

// GET /api/push/public-key — key the browser needs to create a subscription
router.get('/public-key', (_req: Request, res: Response) => {
  res.json({ success: true, enabled: pushEnabled, publicKey: vapidPublicKey });
});

// POST /api/push/subscribe — { subscription, topic: 'new-arrivals' | 'admin-orders' }
router.post('/subscribe', subscribeLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!pushEnabled) throw new AppError('Notifications are not configured on this server.', 503);
    const { subscription, topic } = z
      .object({ subscription: subscriptionSchema, topic: z.enum(['new-arrivals', 'admin-orders']) })
      .parse(req.body);

    // Only the signed-in admin may receive order alerts
    if (topic === 'admin-orders' && req.user?.role !== 'admin') {
      throw new AppError('Only the store admin can receive order alerts.', 403);
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          keys: subscription.keys,
          userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
          ...(topic === 'admin-orders' ? { user: req.user!._id } : {}),
        },
        $addToSet: { topics: topic },
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Notifications turned on.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/push/unsubscribe — { endpoint, topic }
router.post('/unsubscribe', subscribeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint, topic } = z
      .object({ endpoint: z.string().url().max(1000), topic: z.enum(['new-arrivals', 'admin-orders']) })
      .parse(req.body);
    const sub = await PushSubscription.findOneAndUpdate({ endpoint }, { $pull: { topics: topic } }, { new: true });
    if (sub && sub.topics.length === 0) await sub.deleteOne();
    res.json({ success: true, message: 'Notifications turned off.' });
  } catch (err) {
    next(err);
  }
});

export default router;
