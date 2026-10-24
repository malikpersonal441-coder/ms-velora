import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X, Volume2, VolumeX, MessageCircle, Inbox, Sparkles, Smartphone, CheckCircle, ExternalLink } from 'lucide-react';
import { apiRequest, formatPrice } from '../../lib/api';
import type { Order } from '../../types';
import { PushToggleButton } from '../AppActions';
import { subscribePush, isSubscribedLocally, pushSupported } from '../../lib/pwa';

const POLL_MS = 10000; // Check every 10 seconds
const SOUND_KEY = 'bfs_admin_sound';
const SEEN_KEY = 'bfs_admin_seen_orders';
const ALARM_EVERY_MS = 3200;
const ALARM_MAX_MS = 2 * 60 * 1000; // Stop ringing after 2 min if unacknowledged
const VIBRATE = [500, 200, 500, 200, 500, 200, 1000];

// Shared AudioContext unlocked on user gesture
let audioCtx: AudioContext | null = null;
const getCtx = () => {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => undefined);
    return audioCtx;
  } catch {
    return null;
  }
};

if (typeof window !== 'undefined') {
  const unlock = () => {
    getCtx();
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

const tone = (notes: { f: number; t: number; d: number }[], vol: number, type: OscillatorType) => {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  notes.forEach(({ f, t, d }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(vol, now + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + d + 0.05);
  });
};

/** Soft two-note chime for test / sound toggle */
const playChime = () =>
  tone(
    [
      { f: 1046.5, t: 0, d: 0.5 },
      { f: 1568.0, t: 0.15, d: 0.6 },
    ],
    0.3,
    'triangle'
  );

/** Urgent luxury shop chime for new orders */
const playAlarm = () => {
  // Layer 1: Bright ringing chime
  tone(
    [
      { f: 1046.5, t: 0, d: 0.35 },    // C6
      { f: 1318.5, t: 0.12, d: 0.38 },  // E6
      { f: 1568.0, t: 0.24, d: 0.45 },  // G6
      { f: 2093.0, t: 0.38, d: 0.75 },  // C7
    ],
    0.55,
    'triangle'
  );
  // Layer 2: Resonant crystal harmonic
  tone(
    [
      { f: 1318.5, t: 0.45, d: 0.3 },
      { f: 1760.0, t: 0.65, d: 0.4 },
      { f: 2093.0, t: 0.85, d: 0.7 },
    ],
    0.45,
    'sine'
  );
};

/** Voice announcement: speaks the customer's name and amount out loud */
const speakOrderAlert = (customerName: string, amount: number) => {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanName = customerName.replace(/[^a-zA-Z\s]/g, '').trim() || 'Valued Customer';
    const text = `New order from ${cleanName}. Amount ${Math.round(amount)} rupees.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
    if (enVoice) utterance.voice = enVoice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech errors gracefully
  }
};

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};

const readSeen = (): Set<string> | null => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const writeSeen = (ids: Set<string>) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-300)));
  } catch {
    // ignore
  }
};

interface Props {
  onOpenOrder: (order: Order) => void;
  onNewCount: (count: number) => void;
}

export const NewOrderNotifier: React.FC<Props> = ({ onOpenOrder, onNewCount }) => {
  const [unread, setUnread] = useState<Order[]>([]);
  const [alert, setAlert] = useState<{ order: Order; count: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const [devicePushActive, setDevicePushActive] = useState(() => isSubscribedLocally('admin-orders'));
  const [subscribing, setSubscribing] = useState(false);

  const seen = useRef<Set<string> | null>(readSeen());
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const panelRef = useRef<HTMLDivElement>(null);
  const alarmTimer = useRef<number | undefined>(undefined);
  const titleTimer = useRef<number | undefined>(undefined);
  const baseTitle = useRef(document.title);

  useEffect(() => onNewCount(unread.length), [unread.length, onNewCount]);

  const stopAlarm = useCallback(() => {
    window.clearInterval(alarmTimer.current);
    window.clearInterval(titleTimer.current);
    alarmTimer.current = undefined;
    if (titleTimer.current !== undefined) document.title = baseTitle.current;
    titleTimer.current = undefined;
    if ('vibrate' in navigator) navigator.vibrate(0);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const startAlarm = useCallback(
    (order: Order, count: number) => {
      stopAlarm();
      baseTitle.current = document.title;
      const customerName = order.shippingAddress.fullName || 'Customer';
      const flash = `🚨 NEW ORDER: ${customerName.toUpperCase()}`;
      let on = false;
      titleTimer.current = window.setInterval(() => {
        on = !on;
        document.title = on ? flash : baseTitle.current;
      }, 900);

      if ('vibrate' in navigator) navigator.vibrate(VIBRATE);

      if (!soundRef.current) return;

      const started = Date.now();
      playAlarm();
      // Announce customer's name after chime
      setTimeout(() => {
        speakOrderAlert(customerName, order.totalAmount);
      }, 700);

      alarmTimer.current = window.setInterval(() => {
        if (Date.now() - started > ALARM_MAX_MS) {
          window.clearInterval(alarmTimer.current);
          return;
        }
        playAlarm();
      }, ALARM_EVERY_MS);
    },
    [stopAlarm]
  );

  const dismissAlert = useCallback(() => {
    setAlert(null);
    stopAlarm();
  }, [stopAlarm]);

  // Request & Auto-enroll device in admin order notifications
  const enableDeviceAlerts = async () => {
    if (!pushSupported()) return;
    setSubscribing(true);
    try {
      await subscribePush('admin-orders');
      setDevicePushActive(true);
      playChime();
    } catch (err: any) {
      console.warn('[push] enrollment error', err?.message);
    } finally {
      setSubscribing(false);
    }
  };

  // Check for orders via polling
  const check = useCallback(async () => {
    try {
      const res = await apiRequest('/api/admin/orders?limit=20');
      const orders: Order[] = res.orders || [];
      if (!seen.current) {
        seen.current = new Set(orders.map((o) => o._id));
        writeSeen(seen.current);
        return;
      }
      const fresh = orders.filter((o) => !seen.current!.has(o._id));
      if (fresh.length === 0) return;
      fresh.forEach((o) => seen.current!.add(o._id));
      writeSeen(seen.current);

      setUnread((u) => [...fresh, ...u].slice(0, 50));
      let total = fresh.length;
      setAlert((a) => {
        total = (a?.count || 0) + fresh.length;
        return { order: fresh[0], count: total };
      });
      startAlarm(fresh[0], total);

      // System notification for Desktop & Mobile Notification Center with Customer Name
      if ('Notification' in window && Notification.permission === 'granted') {
        const title =
          fresh.length > 1
            ? `🚨 ${fresh.length} New Orders! Latest: ${fresh[0].shippingAddress.fullName}`
            : `🚨 New Order: ${fresh[0].shippingAddress.fullName}`;
        const opts: NotificationOptions = {
          body: `Customer: ${fresh[0].shippingAddress.fullName}\nTotal: ${formatPrice(fresh[0].totalAmount)} • ${fresh[0].shippingAddress.city}\nOrder #${fresh[0].orderNumber}`,
          icon: '/brand/icon-192.png',
          badge: '/brand/favicon-32.png',
          tag: `order-${fresh[0]._id}`,
          renotify: true,
          requireInteraction: true,
          silent: false,
          vibrate: VIBRATE,
          data: { url: '/admin' },
        };
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then((reg) => reg.showNotification(title, opts))
            .catch(() => new Notification(title, opts));
        } else {
          new Notification(title, opts);
        }
      }
    } catch {
      // offline / signed out — retry on next tick
    }
  }, [startAlarm]);

  useEffect(() => {
    check();
    const id = window.setInterval(check, POLL_MS);
    const onVisible = () => !document.hidden && check();
    document.addEventListener('visibilitychange', onVisible);

    // Auto-subscribe if permission was already granted previously
    if (pushSupported() && 'Notification' in window) {
      if (Notification.permission === 'granted' && !isSubscribedLocally('admin-orders')) {
        subscribePush('admin-orders')
          .then(() => setDevicePushActive(true))
          .catch(() => undefined);
      }
    }

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      stopAlarm();
    };
  }, [check, stopAlarm]);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openOrder = (o: Order) => {
    setUnread((u) => u.filter((x) => x._id !== o._id));
    dismissAlert();
    setOpen(false);
    onOpenOrder(o);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      // ignore
    }
    if (next) playChime();
    else window.clearInterval(alarmTimer.current);
  };

  // Test Order Alert Simulation
  const triggerTestAlert = () => {
    getCtx();
    const mockOrder: Order = {
      _id: 'test-' + Date.now(),
      orderNumber: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
      items: [
        {
          product: 'test-prod',
          title: 'Royal Diamond Solitaire Ring',
          price: 45000,
          quantity: 1,
        } as any,
      ],
      subtotal: 45000,
      totalAmount: 45000,
      discountAmount: 0,
      shippingCost: 0,
      taxAmount: 0,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      shippingAddress: {
        fullName: 'Fatima Noor (Test Customer)',
        phone: '03001234567',
        addressLine1: 'DHA Phase 5',
        city: 'Lahore',
        country: 'Pakistan',
      },
      orderSource: 'website',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    setAlert({ order: mockOrder, count: 1 });
    startAlarm(mockOrder, 1);

    if ('Notification' in window && Notification.permission === 'granted') {
      const opts: NotificationOptions = {
        body: `Customer: Fatima Noor • Rs. 45,000 • Lahore • Order #${mockOrder.orderNumber}`,
        icon: '/brand/icon-192.png',
        badge: '/brand/favicon-32.png',
        tag: 'test-order-alert',
        renotify: true,
        requireInteraction: true,
        silent: false,
        vibrate: VIBRATE,
        data: { url: '/admin' },
      };
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => reg.showNotification('🚨 Test Order Alert: Fatima Noor', opts))
          .catch(() => new Notification('🚨 Test Order Alert: Fatima Noor', opts));
      } else {
        new Notification('🚨 Test Order Alert: Fatima Noor', opts);
      }
    }
  };

  const count = unread.length;

  return (
    <div className="relative flex items-center gap-2" ref={panelRef}>
      {/* Bell icon with live badge */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          dismissAlert();
          getCtx();
        }}
        className={`relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border transition-colors shadow-sm ${
          open ? 'border-[#C5A059] text-[#9E7B36]' : 'border-black/10 text-neutral-600 hover:border-[#C5A059] hover:text-[#9E7B36]'
        }`}
        aria-label={count ? `${count} new orders` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className={`w-[18px] h-[18px] ${count ? 'animate-[wiggle_1s_ease-in-out_infinite] text-[#9E7B36]' : ''}`} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C5A059] text-[#0D0D0D] text-[10px] font-bold flex items-center justify-center ring-2 ring-white badge-pop">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* New order popup, centred over the admin panel */}
      <AnimatePresence>
        {alert && (
          <motion.div
            key="new-order-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0D0D0D]/60 backdrop-blur-sm"
            onClick={dismissAlert}
          >
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-2xl bg-white text-left shadow-[0_25px_65px_-15px_rgba(13,13,13,0.45)] border-2 border-[#C5A059] overflow-hidden"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="new-order-side-title"
          >
            {/* Top Accent Strip with Sound Indicator & Close */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#DFBD78] via-[#C5A059] to-[#9E7B36] text-[#0D0D0D]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">
                  {alert.count > 1 ? `🚨 ${alert.count} New Orders Received!` : '🚨 New Order Received!'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="p-1 rounded text-[#0D0D0D]/80 hover:text-black hover:bg-black/10 transition-colors cursor-pointer"
                  title={soundOn ? 'Sound On' : 'Sound Muted'}
                >
                  {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="p-1 rounded text-[#0D0D0D]/80 hover:text-black hover:bg-black/10 transition-colors cursor-pointer"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body: Customer Name & Order Details */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#9E7B36] font-bold block">
                    Customer Name
                  </span>
                  <h3 id="new-order-side-title" className="font-serif-luxury text-2xl font-bold text-[#0D0D0D] leading-tight truncate">
                    {alert.order.shippingAddress.fullName}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium mt-0.5 truncate">
                    Order #{alert.order.orderNumber} • {alert.order.shippingAddress.city}
                    {alert.order.orderSource === 'whatsapp' && ' • WhatsApp'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">Total</span>
                  <p className="text-xl font-bold text-[#0D0D0D] tabular-nums">
                    {formatPrice(alert.order.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    if (alert.count > 1) {
                      dismissAlert();
                      setOpen(true);
                    } else {
                      openOrder(alert.order);
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0D0D0D] text-white hover:bg-[#C5A059] hover:text-[#0D0D0D] text-xs font-bold uppercase tracking-wider transition-colors shadow-sm text-center cursor-pointer"
                >
                  {alert.count > 1 ? 'View All Orders' : 'View Order Details'}
                </button>

                {alert.order.shippingAddress.phone && (
                  <a
                    href={`https://wa.me/${alert.order.shippingAddress.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(
                      `Hello ${alert.order.shippingAddress.fullName}, thank you for placing order #${alert.order.orderNumber} with MS Velora Fine Jewellery! We are preparing your order.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Open WhatsApp chat with customer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={dismissAlert}
                  className="py-2.5 px-3 rounded-xl border border-black/15 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown Inbox */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 z-[80] w-[min(390px,calc(100vw-24px))] rounded-2xl bg-white border border-black/10 shadow-[0_24px_60px_-16px_rgba(13,13,13,0.35)] overflow-hidden"
            role="dialog"
            aria-label="New orders"
          >
            {/* Dropdown Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-[#FAF8F5]">
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D]">Orders Inbox</p>
                <p className="text-[11px] text-neutral-500">{count ? `${count} waiting for confirmation` : 'All caught up'}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-2 rounded-lg transition-colors ${
                    soundOn ? 'text-[#9E7B36] hover:bg-[#C5A059]/15' : 'text-neutral-400 hover:bg-neutral-100'
                  }`}
                  aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
                  title={soundOn ? 'Sound On' : 'Sound Muted'}
                >
                  {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-[#0D0D0D]"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Test & Status Bar */}
            <div className="p-3 border-b border-black/5 bg-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Audio & Voice Alerts On</span>
              </div>
              <button
                type="button"
                onClick={triggerTestAlert}
                className="px-2.5 py-1 rounded bg-[#0D0D0D] text-white hover:bg-[#C5A059] hover:text-[#0D0D0D] text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                title="Test sound, customer name speech and mobile notification"
              >
                🔊 Test Alert
              </button>
            </div>

            {/* Device Push Notification Banner if not yet active */}
            {!devicePushActive && pushSupported() && (
              <div className="p-3 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-amber-900 leading-tight">
                  <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Receive push sound on this mobile/desktop device even when locked?</span>
                </div>
                <button
                  type="button"
                  onClick={enableDeviceAlerts}
                  disabled={subscribing}
                  className="px-3 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {subscribing ? 'Enabling...' : 'Enable'}
                </button>
              </div>
            )}

            {count === 0 ? (
              <div className="px-6 py-10 text-center text-neutral-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p className="text-xs font-medium text-neutral-500">No new orders right now.</p>
                <p className="text-[11px] text-neutral-400 mt-1">When an order arrives, an alarm will ring with customer name on the side of the screen.</p>
              </div>
            ) : (
              <ul className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain divide-y divide-black/5">
                {unread.map((o) => (
                  <li key={o._id}>
                    <button
                      type="button"
                      onClick={() => openOrder(o)}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[#FAF8F5] transition-colors"
                    >
                      <span className="w-9 h-9 shrink-0 rounded-full bg-[#F3EFE6] text-[#9E7B36] text-[11px] font-bold flex items-center justify-center">
                        {o.shippingAddress.fullName
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0D0D0D] truncate">
                          {o.shippingAddress.fullName}
                          {o.orderSource === 'whatsapp' && <MessageCircle className="w-3 h-3 text-[#128C7E] shrink-0" />}
                        </span>
                        <span className="block text-[11px] text-neutral-500 truncate">
                          #{o.orderNumber} • {o.shippingAddress.city} • {timeAgo(o.createdAt)}
                        </span>
                      </span>
                      <span className="text-[13px] font-semibold text-[#0D0D0D] tabular-nums whitespace-nowrap">
                        {formatPrice(o.totalAmount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Bottom Controls */}
            <div className="px-4 py-2.5 border-t border-black/5 flex items-center justify-between gap-3 bg-[#FAF8F5]">
              <PushToggleButton
                topic="admin-orders"
                onLabel="Device Push: Off"
                offLabel="Device Push: On"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9E7B36] hover:text-[#0D0D0D] disabled:opacity-60"
              />
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => setUnread([])}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-[#0D0D0D]"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
