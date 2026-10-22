import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X, Volume2, VolumeX, MessageCircle, Inbox } from 'lucide-react';
import { apiRequest, formatPrice } from '../../lib/api';
import type { Order } from '../../types';
import { PushToggleButton } from '../AppActions';

const POLL_MS = 15000;
const SOUND_KEY = 'bfs_admin_sound';
const SEEN_KEY = 'bfs_admin_seen_orders';
const ALARM_EVERY_MS = 2500;
const ALARM_MAX_MS = 2 * 60 * 1000; // stop ringing after 2 min even if nobody taps
const VIBRATE = [400, 150, 400, 150, 800];

// One shared AudioContext, unlocked on the admin's first click/tap so the
// alarm can play later without a fresh user gesture (browser autoplay rules).
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
  window.addEventListener('pointerdown', getCtx, { once: true });
  window.addEventListener('keydown', getCtx, { once: true });
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

/** Soft two-note chime (sound toggle preview). */
const playChime = () =>
  tone(
    [
      { f: 1046.5, t: 0, d: 0.7 },
      { f: 1568, t: 0.14, d: 0.7 },
    ],
    0.18,
    'sine'
  );

/** Loud, urgent bell ring used for the new-order alarm. */
const playAlarm = () => {
  tone(
    [0, 0.18, 0.36, 0.54].map((t, i) => ({ f: i % 2 ? 1318.5 : 1760, t, d: 0.16 })),
    0.4,
    'square'
  );
  tone(
    [
      { f: 880, t: 0.8, d: 0.5 },
      { f: 1174.7, t: 0.95, d: 0.6 },
    ],
    0.35,
    'triangle'
  );
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

/**
 * Header bell: polls for new orders and raises a full-screen alert that rings,
 * vibrates and flashes the tab title until acknowledged. Dropdown inbox lists unread orders.
 */
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
  }, []);

  const startAlarm = useCallback(
    (count: number) => {
      stopAlarm();
      baseTitle.current = document.title;
      const flash = `🔔 ${count > 1 ? `${count} NEW ORDERS` : 'NEW ORDER'}`;
      let on = false;
      titleTimer.current = window.setInterval(() => {
        on = !on;
        document.title = on ? flash : baseTitle.current;
      }, 1000);
      if ('vibrate' in navigator) navigator.vibrate(VIBRATE);
      if (!soundRef.current) return;
      const started = Date.now();
      playAlarm();
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

  const check = useCallback(async () => {
    try {
      const res = await apiRequest('/api/admin/orders?limit=20');
      const orders: Order[] = res.orders || [];
      if (!seen.current) {
        // First ever visit: treat existing orders as already seen
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
      startAlarm(total);

      // System notification as well when the admin isn't looking at this tab; stays until tapped
      if ('Notification' in window && Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
        const title = fresh.length > 1 ? `🔔 ${fresh.length} new orders` : `🔔 New order ${fresh[0].orderNumber}`;
        const opts = {
          body: `${fresh[0].shippingAddress.fullName} • ${formatPrice(fresh[0].totalAmount)}`,
          icon: '/brand/icon-192.png',
          tag: 'bfs-new-order',
          renotify: true,
          requireInteraction: true,
          vibrate: VIBRATE,
          data: { url: '/admin' },
        } as NotificationOptions;
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
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
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

  const count = unread.length;

  return (
    <div className="relative flex items-center gap-2" ref={panelRef}>
      {/* Bell with unread count */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          dismissAlert();
        }}
        className={`relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border transition-colors shadow-sm ${
          open ? 'border-[#C5A059] text-[#9E7B36]' : 'border-black/10 text-neutral-600 hover:border-[#C5A059] hover:text-[#9E7B36]'
        }`}
        aria-label={count ? `${count} new orders` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className={`w-[18px] h-[18px] ${count ? 'animate-[wiggle_1s_ease-in-out_1]' : ''}`} key={count} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C5A059] text-[#0D0D0D] text-[10px] font-bold flex items-center justify-center ring-2 ring-[#F3EFE6] badge-pop">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Full-screen new-order alert: rings until acknowledged */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0D0D0D]/70 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="new-order-alert-title"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="relative w-full max-w-sm rounded-3xl bg-white text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="relative flex items-center justify-center bg-gradient-to-br from-[#C5A059] via-[#DFBD78] to-[#9E7B36] px-6 py-8">
                <span className="absolute w-24 h-24 rounded-full bg-white/40 animate-ping" aria-hidden />
                <span className="relative w-20 h-20 rounded-full bg-white text-[#9E7B36] flex items-center justify-center shadow-lg">
                  <Bell className="w-10 h-10 animate-[wiggle_0.6s_ease-in-out_infinite]" />
                </span>
              </div>
              <div className="px-6 pt-5 pb-6 space-y-1">
                <p className="text-[11px] uppercase tracking-[0.24em] font-bold text-[#9E7B36]">
                  {alert.count > 1 ? `${alert.count} new orders` : 'New order received'}
                </p>
                <h2 id="new-order-alert-title" className="font-serif-luxury text-2xl font-semibold text-[#0D0D0D]">
                  {alert.order.shippingAddress.fullName}
                </h2>
                <p className="text-sm text-neutral-500">
                  {alert.order.orderNumber} • {alert.order.shippingAddress.city}
                  {alert.order.orderSource === 'whatsapp' && ' • WhatsApp'}
                </p>
                <p className="pt-2 text-3xl font-bold text-[#0D0D0D] tabular-nums">{formatPrice(alert.order.totalAmount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 px-6 pb-6">
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="py-3 rounded-xl border border-black/10 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Dismiss
                </button>
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
                  className="py-3 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold hover:bg-[#9E7B36] transition-colors"
                >
                  {alert.count > 1 ? 'View all' : 'View order'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inbox dropdown (scrollable) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 z-[80] w-[min(380px,calc(100vw-24px))] rounded-2xl bg-white border border-black/10 shadow-[0_24px_60px_-16px_rgba(13,13,13,0.35)] overflow-hidden"
            role="dialog"
            aria-label="New orders"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D]">New orders</p>
                <p className="text-[11px] text-neutral-500">{count ? `${count} waiting` : 'You are all caught up'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-[#0D0D0D]"
                  aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
                  title={soundOn ? 'Sound on' : 'Sound off'}
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

            {count === 0 ? (
              <div className="px-6 py-10 text-center text-neutral-400">
                <Inbox className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">New orders will appear here with an alarm.</p>
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
                          {o.orderNumber} • {o.shippingAddress.city} • {timeAgo(o.createdAt)}
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

            <div className="px-4 py-2.5 border-t border-black/5 flex items-center justify-between gap-3 bg-[#FAF8F5]">
              <PushToggleButton
                topic="admin-orders"
                onLabel="Alerts on this device"
                offLabel="Device alerts on"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9E7B36] hover:text-[#0D0D0D] disabled:opacity-60"
              />
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => setUnread([])}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-[#0D0D0D]"
                >
                  Mark all as seen
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
