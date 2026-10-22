import { apiRequest } from './api';

export type PushTopic = 'new-arrivals' | 'admin-orders';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const register = () =>
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[pwa] SW registration failed', err));
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

// ── Install prompt ──
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

export const canPromptInstall = () => Boolean(deferredPrompt);

export function onInstallAvailabilityChange(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome === 'accepted' ? 'accepted' : 'dismissed';
}

// ── Push subscriptions ──
export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const urlBase64ToUint8Array = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const topicKey = (t: PushTopic) => `bfs_push_${t}`;

export function isSubscribedLocally(topic: PushTopic) {
  try {
    return localStorage.getItem(topicKey(topic)) === '1' && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

/** Asks permission (if needed), subscribes this device and registers it for `topic`. */
export async function subscribePush(topic: PushTopic): Promise<void> {
  if (!pushSupported()) {
    throw new Error(
      isIOS()
        ? 'On iPhone/iPad: 1) Open in Safari 2) Tap Share → Add to Home Screen 3) Open the app from Home Screen 4) Then enable notifications.'
        : 'This browser does not support notifications.'
    );
  }

  // iOS requires the app to be in standalone mode (added to home screen)
  if (isIOS() && !isStandalone()) {
    throw new Error('Please add this site to your Home Screen first (Share → Add to Home Screen), then open it from there to enable notifications.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.');

  const keyRes = await apiRequest('/api/push/public-key');
  if (!keyRes.enabled || !keyRes.publicKey) throw new Error('Notifications are not set up on the server yet.');

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
    }));

  await apiRequest('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: sub.toJSON(), topic }),
  });
  try {
    localStorage.setItem(topicKey(topic), '1');
  } catch {
    // ignore
  }
}

export async function unsubscribePush(topic: PushTopic): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await apiRequest('/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: sub.endpoint, topic }),
    });
  }
  try {
    localStorage.removeItem(topicKey(topic));
  } catch {
    // ignore
  }
}
