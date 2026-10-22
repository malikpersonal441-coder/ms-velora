import '../config/env'; // ensure .env is loaded before reading VAPID keys
import webpush from 'web-push';
import { PushSubscription, PushTopic } from '../models/PushSubscription';

const PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

export const pushEnabled = Boolean(PUBLIC && PRIVATE);
export const vapidPublicKey = PUBLIC;

if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
  /** Keeps the notification on screen until tapped and vibrates hard (new-order alarm). */
  urgent?: boolean;
}

/**
 * Sends a notification to every device subscribed to `topic`.
 * Subscriptions the browser reports as gone (404/410) are deleted.
 * Never throws — a failed notification must not break an order or product save.
 */
export async function sendToTopic(topic: PushTopic, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!pushEnabled) return { sent: 0, removed: 0 };
  let sent = 0;
  let removed = 0;
  try {
    const subs = await PushSubscription.find({ topics: topic }).lean();
    const body = JSON.stringify({ icon: '/brand/icon-192.png', badge: '/brand/favicon-32.png', ...payload });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 60 * 60 * 24 });
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: s._id });
            removed++;
          } else {
            console.warn('[push] send failed', err?.statusCode || err?.message);
          }
        }
      })
    );
  } catch (err: any) {
    console.warn('[push] topic send failed', err?.message);
  }
  return { sent, removed };
}
