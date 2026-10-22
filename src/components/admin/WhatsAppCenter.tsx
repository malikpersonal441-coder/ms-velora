import React, { useCallback, useEffect, useState } from 'react';
import {
  MessageCircle,
  Inbox,
  Truck,
  PackageCheck,
  Wallet,
  Send,
  RefreshCw,
  Save,
  History,
} from 'lucide-react';
import { apiRequest, formatDateTime, formatPrice } from '../../lib/api';
import { DEFAULT_TEMPLATES, PLACEHOLDERS, TEMPLATE_META } from '../../lib/whatsapp';
import type { Order, StoreSettings, WhatsAppTemplateKey, WhatsAppTemplates } from '../../types';
import { WhatsAppComposer } from './WhatsAppComposer';

type QueueKey = 'orderPlaced' | 'shipped' | 'delivered' | 'paymentReminder';

const QUEUES: { key: QueueKey; label: string; icon: React.ElementType; empty: string }[] = [
  { key: 'orderPlaced', label: 'Needs Confirmation', icon: Inbox, empty: 'Every new order has been messaged.' },
  { key: 'shipped', label: 'Shipping Updates', icon: Truck, empty: 'All shipped customers have tracking.' },
  { key: 'delivered', label: 'Thank-You Notes', icon: PackageCheck, empty: 'No delivered orders waiting.' },
  { key: 'paymentReminder', label: 'Payment Reminders', icon: Wallet, empty: 'No pending bank transfers.' },
];

interface Overview {
  stats: { sentToday: number; whatsappOrders: number; totalOrders: number; pendingActions: number };
  queues: Record<QueueKey, Order[]>;
  recentMessages: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    template: string;
    message: string;
    phone: string;
    sentBy: string;
    sentAt: string;
  }[];
}

interface Props {
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const WhatsAppCenter: React.FC<Props> = ({ addToast }) => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplates>(DEFAULT_TEMPLATES);
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [storeNumber, setStoreNumber] = useState('');
  const [activeQueue, setActiveQueue] = useState<QueueKey>('orderPlaced');
  const [composer, setComposer] = useState<{ order: Order; template: WhatsAppTemplateKey } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, st] = await Promise.all([
        apiRequest('/api/admin/whatsapp/overview'),
        apiRequest('/api/admin/settings'),
      ]);
      if (ov.success) setOverview(ov);
      if (st.success) {
        setSettings(st.settings);
        setTemplates({ ...DEFAULT_TEMPLATES, ...(st.settings.whatsappTemplates || {}) });
        setOrderingEnabled(st.settings.whatsappOrderingEnabled !== false);
        setStoreNumber(st.settings.whatsappNumber || '');
      }
    } catch (err: any) {
      addToast(err.message || 'Could not load WhatsApp Center.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          whatsappTemplates: templates,
          whatsappOrderingEnabled: orderingEnabled,
          whatsappNumber: storeNumber,
        }),
      });
      if (res.success) {
        setSettings(res.settings);
        addToast('WhatsApp settings saved.', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Could not save templates.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const queueOrders = overview?.queues?.[activeQueue] || [];
  const stats = overview?.stats;
  const share = stats && stats.totalOrders > 0 ? Math.round((stats.whatsappOrders / stats.totalOrders) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Messages Sent Today', value: stats?.sentToday ?? '—', accent: 'text-[#128C7E]' },
          { label: 'Pending Actions', value: stats?.pendingActions ?? '—', accent: 'text-amber-700' },
          { label: 'WhatsApp Orders', value: stats?.whatsappOrders ?? '—', accent: 'text-[#F2EFE9]' },
          { label: 'Share of All Orders', value: stats ? `${share}%` : '—', accent: 'text-[#D4B06A]' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-xl border border-black/8">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">{s.label}</p>
            <p className={`mt-2 font-serif-luxury text-4xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Action queue */}
      <div className="bg-white rounded-xl border border-black/8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-neutral-200">
          <div className="flex flex-wrap gap-2">
            {QUEUES.map((q) => {
              const count = overview?.queues?.[q.key]?.length ?? 0;
              const Icon = q.icon;
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => setActiveQueue(q.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeQueue === q.key
                      ? 'bg-[#075E54] text-white'
                      : 'bg-neutral-100 text-[#F2EFE9] hover:bg-neutral-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {q.label}
                  <span
                    className={`min-w-5 px-1.5 rounded-full text-[10px] ${
                      activeQueue === q.key ? 'bg-[#25D366] text-[#F2EFE9]' : 'bg-white text-neutral-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-[#F2EFE9]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {queueOrders.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">
            {loading ? 'Loading…' : QUEUES.find((q) => q.key === activeQueue)?.empty}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {queueOrders.map((o) => (
              <li key={o._id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-[#1C1C1F]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#F2EFE9] flex items-center gap-2">
                    {o.shippingAddress.fullName}
                    {o.orderSource === 'whatsapp' && (
                      <span className="px-1.5 py-0.5 rounded bg-[#25D366]/15 text-[#128C7E] text-[10px] font-bold uppercase">
                        WA order
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500 font-mono-code">
                    {o.orderNumber} • {o.shippingAddress.phone} • {o.shippingAddress.city} •{' '}
                    {formatPrice(o.totalAmount)} • {formatDateTime(o.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposer({ order: o, template: activeQueue })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1EBE5A] text-[#F2EFE9] text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Message
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Templates & settings */}
        <form onSubmit={saveTemplates} className="xl:col-span-3 bg-white rounded-xl border border-black/8 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-luxury text-2xl font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#25D366]" /> Templates & Settings
            </h3>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-wider font-semibold rounded-lg disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#C5A059]" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs block">
              <span className="font-semibold">Store WhatsApp number</span>
              <input
                value={storeNumber}
                onChange={(e) => setStoreNumber(e.target.value)}
                placeholder="+92 300 1234567"
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono-code"
              />
            </label>
            <label className="text-xs flex items-center gap-3 p-3 rounded-lg bg-[#1C1C1F] border border-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={orderingEnabled}
                onChange={(e) => setOrderingEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#25D366]"
              />
              <span>
                <span className="font-semibold block">Allow “Order via WhatsApp” at checkout</span>
                <span className="text-neutral-500">Customers can place orders and confirm on WhatsApp</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-neutral-500 mr-1">Placeholders:</span>
            {PLACEHOLDERS.map((p) => (
              <code key={p} className="px-1.5 py-0.5 rounded bg-neutral-100 text-[11px] text-[#D4B06A]">
                {p}
              </code>
            ))}
          </div>

          {(Object.keys(TEMPLATE_META) as WhatsAppTemplateKey[]).map((key) => (
            <label key={key} className="block text-xs">
              <span className="flex items-center justify-between">
                <span className="font-semibold">{TEMPLATE_META[key].label}</span>
                <button
                  type="button"
                  onClick={() => setTemplates((t) => ({ ...t, [key]: DEFAULT_TEMPLATES[key] }))}
                  className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-[#F2EFE9]"
                >
                  Reset
                </button>
              </span>
              <textarea dir="auto"
                value={templates[key]}
                onChange={(e) => setTemplates((t) => ({ ...t, [key]: e.target.value }))}
                rows={3}
                className="mt-1 w-full p-3 border border-neutral-300 rounded-lg text-sm leading-relaxed"
              />
            </label>
          ))}
        </form>

        {/* Recent log */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-black/8 p-5">
          <h3 className="font-serif-luxury text-2xl font-semibold flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-[#D4B06A]" /> Recent Messages
          </h3>
          {!overview?.recentMessages?.length ? (
            <p className="text-sm text-neutral-500">No messages sent yet.</p>
          ) : (
            <ul className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {overview.recentMessages.map((m, i) => (
                <li key={i} className="p-3 rounded-lg bg-[#DCF8C6]/50 border border-[#25D366]/20 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-[#F2EFE9]">{m.customerName}</span>
                    <span className="text-neutral-500">{formatDateTime(m.sentAt)}</span>
                  </div>
                  <p className="text-neutral-500 font-mono-code mt-0.5">
                    {m.orderNumber} •{' '}
                    {m.template === 'custom'
                      ? 'Custom'
                      : TEMPLATE_META[m.template as WhatsAppTemplateKey]?.label || m.template}{' '}
                    • by {m.sentBy}
                  </p>
                  <p dir="auto" className="mt-1.5 whitespace-pre-line text-neutral-700 line-clamp-3">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {composer && (
        <WhatsAppComposer
          order={composer.order}
          settings={settings ? { ...settings, whatsappTemplates: templates } : null}
          initialTemplate={composer.template}
          onClose={() => setComposer(null)}
          onSent={() => {
            addToast('Message logged.', 'success');
            setComposer(null);
            load();
          }}
          onError={(msg) => addToast(msg, 'error')}
        />
      )}
    </div>
  );
};
