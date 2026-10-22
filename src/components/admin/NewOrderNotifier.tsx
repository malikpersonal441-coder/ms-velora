import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X, Volume2, VolumeX, MessageCircle, Inbox } from 'lucide-react';
import { apiRequest, formatPrice } from '../../lib/api';
import type { Order } from '../../types';
import { PushToggleButton } from '../AppActions';

const POLL_MS = 15000;
const SOUND_KEY = 'bfs_admin_sound';
const SEEN_KEY = 'bfs_admin_seen_orders';

/** Soft two-note chime made with Web Audio — no sound file to load. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [
      { f: 1046.5, t: 0 },
      { f: 1568, t: 0.14 },
    ].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.8);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // audio unavailable — visual alert still shows
  }
}

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
 * Header bell: polls for new orders, shows one compact toast + chime per batch,
 * and a dropdown inbox (scrollable) listing unread orders.
 */
export const NewOrderNotifier: React.FC<Props> = ({ onOpenOrder, onNewCount }) => {
  const [unread, setUnread] = useState<Order[]>([]);
  const [toast, setToast] = useState<{ order: Order; more: number } | null>(null);
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
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => onNewCount(unread.length), [unread.length, onNewCount]);

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
      setToast({ order: fresh[0], more: fresh.length - 1 });
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 7000);

      if (soundRef.current) playChime();
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(
          fresh.length > 1 ? `${fresh.length} new orders` : `New order ${fresh[0].orderNumber}`,
          {
            body: `${fresh[0].shippingAddress.fullName} • ${formatPrice(fresh[0].totalAmount)}`,
            icon: '/brand/icon-192.png',
            tag: 'bfs-new-orders',
          }
        );
      }
    } catch {
      // offline / signed out — retry on next tick
    }
  }, []);

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
      window.clearTimeout(toastTimer.current);
    };
  }, [check]);

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
    setToast(null);
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
  };

  const count = unread.length;

  return (
    <div className="relative flex items-center gap-2" ref={panelRef}>
      {/* Bell with unread count */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setToast(null);
        }}
        className={`relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border transition-colors shadow-sm ${
          open ? 'border-[#C5A059] text-[#D4B06A]' : 'border-black/10 text-neutral-600 hover:border-[#C5A059] hover:text-[#D4B06A]'
        }`}
        aria-label={count ? `${count} new orders` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className={`w-[18px] h-[18px] ${count ? 'animate-[wiggle_1s_ease-in-out_1]' : ''}`} key={count} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C5A059] text-[#F2EFE9] text-[10px] font-bold flex items-center justify-center ring-2 ring-[#26262B] badge-pop">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Compact toast under the bell */}
      <AnimatePresence>
        {toast && !open && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            onClick={() => (toast.more > 0 ? setOpen(true) : openOrder(toast.order))}
            className="absolute right-0 top-12 z-[80] w-[min(320px,calc(100vw-24px))] text-left flex items-center gap-3 p-3 rounded-xl bg-[#E8E4DC] text-[#1C1C1F] border border-[#C5A059]/40 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]"
            role="status"
          >
            <span className="w-8 h-8 rounded-full bg-[#C5A059]/15 text-[#DFBD78] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold truncate">
                {toast.more > 0 ? `${toast.more + 1} new orders` : `New order from ${toast.order.shippingAddress.fullName}`}
              </span>
              <span className="block text-[11px] text-white/55 truncate">
                {toast.order.orderNumber} • {formatPrice(toast.order.totalAmount)} • tap to view
              </span>
            </span>
          </motion.button>
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
                <p className="text-sm font-semibold text-[#F2EFE9]">New orders</p>
                <p className="text-[11px] text-neutral-500">{count ? `${count} waiting` : 'You are all caught up'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-[#F2EFE9]"
                  aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
                  title={soundOn ? 'Sound on' : 'Sound off'}
                >
                  {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-[#F2EFE9]"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {count === 0 ? (
              <div className="px-6 py-10 text-center text-neutral-400">
                <Inbox className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">New orders will appear here with a sound.</p>
              </div>
            ) : (
              <ul className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain divide-y divide-black/5">
                {unread.map((o) => (
                  <li key={o._id}>
                    <button
                      type="button"
                      onClick={() => openOrder(o)}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[#1C1C1F] transition-colors"
                    >
                      <span className="w-9 h-9 shrink-0 rounded-full bg-[#26262B] text-[#D4B06A] text-[11px] font-bold flex items-center justify-center">
                        {o.shippingAddress.fullName
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#F2EFE9] truncate">
                          {o.shippingAddress.fullName}
                          {o.orderSource === 'whatsapp' && <MessageCircle className="w-3 h-3 text-[#128C7E] shrink-0" />}
                        </span>
                        <span className="block text-[11px] text-neutral-500 truncate">
                          {o.orderNumber} • {o.shippingAddress.city} • {timeAgo(o.createdAt)}
                        </span>
                      </span>
                      <span className="text-[13px] font-semibold text-[#F2EFE9] tabular-nums whitespace-nowrap">
                        {formatPrice(o.totalAmount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="px-4 py-2.5 border-t border-black/5 flex items-center justify-between gap-3 bg-[#1C1C1F]">
              <PushToggleButton
                topic="admin-orders"
                onLabel="Alerts on this device"
                offLabel="Device alerts on"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D4B06A] hover:text-[#F2EFE9] disabled:opacity-60"
              />
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => setUnread([])}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-[#F2EFE9]"
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
