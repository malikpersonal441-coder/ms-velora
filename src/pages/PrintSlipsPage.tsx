import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, Pencil, Save, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatPrice } from '../lib/api';
import { code128B } from '../lib/barcode';
import { sized } from '../lib/img';
import type { Order, StoreSettings } from '../types';

type ShipFrom = { name: string; address: string; city: string; phone: string };

const Barcode: React.FC<{ value: string }> = ({ value }) => {
  const modules = useMemo(() => code128B(value), [value]);
  const total = modules.reduce((a, b) => a + b, 0) + 20; // quiet zone
  let x = 10;
  return (
    <svg viewBox={`0 0 ${total} 40`} preserveAspectRatio="none" className="w-full h-full" aria-label={`Barcode ${value}`}>
      {modules.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={40} fill="#000" /> : null;
        x += w;
        return rect;
      })}
    </svg>
  );
};

const PAYMENT: Record<string, string> = {
  cod: 'Cash on Delivery',
  online: 'Online',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank_transfer: 'Bank Transfer',
  online_card: 'Card',
};

const resolveShipFrom = (s: StoreSettings | null): ShipFrom => ({
  name: s?.shipFrom?.name || s?.storeName || 'MS Velora',
  address: s?.shipFrom?.address || s?.showroomAddress || '',
  city: s?.shipFrom?.city || '',
  phone: s?.shipFrom?.phone || s?.contactPhone || s?.whatsappNumber || '',
});

const Slip: React.FC<{ order: Order; from: ShipFrom; color: boolean }> = ({ order, from, color }) => {
  const a = order.shippingAddress;
  const paid = order.paymentStatus === 'paid';
  const cod = order.paymentMethod === 'cod';
  const collect = !paid && cod;
  const unpaidPrepay = !paid && !cod;
  const courier = (order.courierName || 'Leopards').toUpperCase();
  const pieces = order.items.reduce((n, i) => n + i.quantity, 0);
  const first = order.items[0];
  const date = new Date(order.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const label = 'text-[8.5px] font-bold uppercase tracking-[0.28em] text-neutral-500';

  return (
    <section className="slip">
      <div className={`label ${color ? 'is-color' : ''}`}>
        {/* Header band */}
        <div className="lbl-band flex items-center justify-between bg-black text-white px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/brand/logo-mark.png" alt="" className="h-8 w-auto" style={color ? undefined : { filter: 'brightness(0) invert(1)' }} />
            <div className="leading-tight">
              <p className="lbl-brand text-[14px] font-bold tracking-[0.06em]">{from.name}</p>
              <p className="text-[8.5px] uppercase tracking-[0.3em] text-white/70">Shipping Label</p>
            </div>
          </div>
          <div className="text-right leading-none">
            <p className="text-[8.5px] uppercase tracking-[0.3em] text-white/70">Courier</p>
            <p className="mt-1 text-[22px] font-black tracking-[0.08em]">{courier}</p>
          </div>
        </div>

        {/* Body: addresses | details */}
        <div className="grid grid-cols-[1fr_62mm] flex-1 min-h-0">
          {/* Left: SHIP TO, FROM right under it, receiver signature at the bottom */}
          <div className="flex flex-col border-r border-black">
            <div className="px-4 py-3">
              <p className="lbl-pill inline-flex items-center bg-black text-white text-[10px] font-bold tracking-[0.3em] px-2 py-[3px]">SHIP TO</p>
              <p className="mt-2 text-[24px] font-black leading-[1.1] uppercase">{a.fullName}</p>
              <p className="mt-1 text-[19px] font-bold tabular-nums">{a.phone}</p>
              <p className="mt-2 text-[14px] leading-snug">{a.streetAddress}</p>
              <p className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[22px] font-black uppercase leading-none">{a.city}</span>
                <span className="text-[14px] text-neutral-700">
                  {a.province}
                  {a.postalCode ? ` · ${a.postalCode}` : ''}
                </span>
              </p>
              {a.notes && <p className="mt-2 text-[10.5px] italic text-neutral-700">Note: {a.notes}</p>}
              {order.items.some((i) => i.gift) && (
                <p className="mt-1.5 text-[11px] font-bold uppercase">
                  🎁 Gift wrap: {order.items.filter((i) => i.gift).map((i) => `${i.gift!.packageName}${i.gift!.recipientName ? ` (for ${i.gift!.recipientName})` : ''}`).join(', ')}
                </p>
              )}
            </div>
            {/* FROM sits directly under SHIP TO */}
            <div className="mx-4 border-t border-dashed border-neutral-400 pt-2 pb-2">
              <p className="lbl-pill inline-flex items-center border border-black text-[10px] font-bold tracking-[0.3em] px-2 py-[3px]">FROM</p>
              <p className="mt-1.5 text-[16px] font-extrabold leading-tight uppercase">{from.name}</p>
              {from.phone && <p className="mt-0.5 text-[14px] font-bold tabular-nums">{from.phone}</p>}
              <p className="mt-1 text-[12.5px] leading-snug text-neutral-800">{[from.address, from.city].filter(Boolean).join(', ')}</p>
            </div>
            {/* Product photo + short description + thank-you note */}
            <div className="mt-auto border-t border-black px-4 py-2.5 flex items-center gap-3">
              {first?.image && (
                <img
                  src={sized(first.image, 200, 70)}
                  alt=""
                  className="w-[18mm] h-[18mm] shrink-0 rounded-md object-cover border border-neutral-300"
                  style={color ? undefined : { filter: 'grayscale(1) contrast(1.1)' }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold leading-tight truncate">{first?.name}</p>
                <p className="text-[10px] text-neutral-600 leading-snug truncate">
                  {[first?.brand, `Qty ${first?.quantity ?? 1}`].filter(Boolean).join(' · ')}
                  {order.items.length > 1 ? ` · +${order.items.length - 1} more item${order.items.length > 2 ? 's' : ''}` : ''}
                </p>
                <p className="lbl-thanks mt-1 font-serif-luxury italic text-[18px] leading-tight">
                  Thank you for shopping with <span className="not-italic font-bold tracking-wide">MS Velora</span> <span className="not-italic text-[13px]">✦</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right: payment · details · barcode */}
          <div className="flex flex-col">
            <div
              className={`px-3 py-3 text-center border-b border-black ${collect ? 'lbl-cod bg-black text-white' : ''}`}
            >
              {collect && (
                <>
                  <p className="text-[9px] font-bold tracking-[0.25em]">COLLECT CASH · COD</p>
                  <p className="mt-1 text-[24px] font-black tabular-nums leading-none">{formatPrice(order.totalAmount)}</p>
                </>
              )}
              {paid && (
                <>
                  <p className="text-[9px] font-bold tracking-[0.25em]">PREPAID</p>
                  <p className="mt-1 text-[17px] font-black leading-none">Do not collect</p>
                </>
              )}
              {unpaidPrepay && (
                <>
                  <p className="text-[9px] font-bold tracking-[0.2em]">⚠ PAYMENT PENDING</p>
                  <p className="mt-1 text-[10.5px] font-semibold leading-snug">Do not dispatch until payment is verified</p>
                </>
              )}
            </div>

            <dl className="flex-1 px-3 py-2.5 text-[11px] leading-[1.55] grid grid-cols-[auto_1fr] gap-x-3 content-start">
              <dt className="text-neutral-500">Order</dt>
              <dd className="font-bold text-right">{order.orderNumber}</dd>
              <dt className="text-neutral-500">Date</dt>
              <dd className="font-semibold text-right">{date}</dd>
              <dt className="text-neutral-500">Pieces</dt>
              <dd className="font-semibold text-right">{pieces}</dd>
              <dt className="text-neutral-500">Payment</dt>
              <dd className="font-semibold text-right">{PAYMENT[order.paymentMethod] || order.paymentMethod}</dd>
              {!collect && (
                <>
                  <dt className="text-neutral-500">Value</dt>
                  <dd className="font-semibold text-right tabular-nums">{formatPrice(order.totalAmount)}</dd>
                </>
              )}
              <dt className="text-neutral-500">CN #</dt>
              <dd className="font-bold text-right">{order.trackingNumber || '—'}</dd>
            </dl>

            <div className="border-t border-black px-3 pt-2.5 pb-2">
              <div className="h-12">
                <Barcode value={order.orderNumber} />
              </div>
              <p className="mt-1 text-center text-[10px] font-bold tracking-[0.25em]">{order.orderNumber}</p>
            </div>
          </div>
        </div>

        {/* Footer: contents */}
        <div className="border-t border-black px-4 py-2 flex items-center justify-between gap-4 text-[10.5px]">
          <p className="min-w-0 truncate">
            <span className={label}>Contents&nbsp;&nbsp;</span>
            {order.items
              .slice(0, 3)
              .map((i) => `${i.quantity} × ${i.name}`)
              .join('  ·  ')}
            {order.items.length > 3 ? `  ·  +${order.items.length - 3} more` : ''}
          </p>
          <p className="shrink-0 font-semibold uppercase tracking-[0.15em] text-[9px]">Fragile · Handle with care</p>
        </div>
      </div>
    </section>
  );
};

// Sample data for the dev-only preview (/admin/slips?demo=1) — never used in production
const sampleOrder = (n: number, name: string, city: string, method: Order['paymentMethod'], paid: boolean): Order =>
  ({
    _id: `sample-${n}`,
    orderNumber: `MS-00${n}`,
    createdAt: new Date().toISOString(),
    paymentMethod: method,
    paymentStatus: paid ? 'paid' : 'pending',
    fulfillmentStatus: 'confirmed',
    courierName: n % 2 ? 'Leopards' : 'TCS',
    trackingNumber: n % 2 ? 'LE7781234567' : '',
    totalAmount: 46500 * n,
    items: [{ name: 'Aurora Pearl Drop Necklace', brand: 'MS Velora', sku: '', quantity: 1, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85' }],
    shippingAddress: {
      fullName: name,
      phone: '0300 1234567',
      streetAddress: 'House 12, Street 4, Block C, Model Town',
      city,
      province: 'Punjab',
      postalCode: '54000',
      country: 'Pakistan',
      email: 'sample@example.com',
    },
  }) as unknown as Order;
const SAMPLE_ORDERS: Order[] = import.meta.env.DEV
  ? [sampleOrder(1, 'Ahmed Raza', 'Lahore', 'cod', false), sampleOrder(2, 'Sana Khan', 'Karachi', 'online', true)]
  : [];

/** /admin/slips?ids=a,b,c — A4 sheets with two shipping slips each. */
export const PrintSlipsPage: React.FC = () => {
  const { settings, user, authLoading, addToast, refreshStorefront } = useStore();
  const [params] = useSearchParams();
  const ids = useMemo(() => (params.get('ids') || '').split(',').filter(Boolean).slice(0, 100), [params]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<ShipFrom>(() => resolveShipFrom(settings));
  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(() => {
    try {
      return localStorage.getItem('bfs_slip_color') === '1';
    } catch {
      return false;
    }
  });
  const setPrintMode = (c: boolean) => {
    setColor(c);
    try {
      localStorage.setItem('bfs_slip_color', c ? '1' : '0');
    } catch {
      // ignore
    }
  };
  const [draft, setDraft] = useState<ShipFrom>(from);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setFrom(resolveShipFrom(settings));
  }, [settings, editing]);

  useEffect(() => {
    document.title = 'Shipping Slips';
    if (authLoading) return;
    if (import.meta.env.DEV && params.get('demo') === '1') {
      setOrders(SAMPLE_ORDERS);
      setLoading(false);
      return;
    }
    if (!user || user.role !== 'admin') {
      setError('Please sign in to the admin first.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // Server enforces admin access on every order fetch
        const results = await Promise.all(ids.map((id) => apiRequest(`/api/admin/orders/${id}`).then((r) => r.order as Order)));
        setOrders(results.filter(Boolean));
      } catch (err: any) {
        setError(err.message || 'Could not load the orders.');
      } finally {
        setLoading(false);
      }
    })();
  }, [ids, user, authLoading, params]);

  const saveFrom = async (persist: boolean) => {
    setFrom(draft);
    setEditing(false);
    if (!persist) return;
    setSaving(true);
    try {
      await apiRequest('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ shipFrom: draft }) });
      await refreshStorefront();
      addToast('"From" address saved for all future slips.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Could not save the address.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pages: Order[][] = [];
  for (let i = 0; i < orders.length; i += 2) pages.push(orders.slice(i, i + 2));

  return (
    <div className="print-slips min-h-screen bg-neutral-200 text-black">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        .print-slips .sheet { width: 210mm; height: 297mm; background: #fff; margin: 0 auto 12px; display: flex; flex-direction: column; box-shadow: 0 6px 24px rgba(0,0,0,.15); }
        .print-slips .slip { height: 148.5mm; padding: 6.5mm 9mm; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; }
        .print-slips .label { flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1.5px solid #000; border-radius: 6px; overflow: hidden; }
        .print-slips .label.is-color { border-color: #9E7B36; }
        .print-slips .label.is-color .lbl-band { background: linear-gradient(100deg, #0B0B0D 0%, #1c1810 60%, #2a2214 100%); border-bottom: 2px solid #C5A059; }
        .print-slips .label.is-color .lbl-brand { color: #E9CF92; }
        .print-slips .label.is-color .lbl-pill { background: #C5A059; color: #0D0D0D; }
        .print-slips .label.is-color .lbl-cod { background: linear-gradient(135deg, #9E7B36, #DFBD78); color: #0D0D0D; }
        .print-slips .label.is-color .border-black { border-color: rgba(158,123,54,.55); }
        .print-slips .label.is-color .lbl-thanks { color: #9E7B36; }
        .print-slips .cut { position: relative; border-top: 1.5px dashed #777; }
        .print-slips .cut span { position: absolute; left: 50%; top: -9px; transform: translateX(-50%); background: #fff; padding: 0 8px; font-size: 10px; color: #777; letter-spacing: .2em; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-slips { background: #fff; min-height: 0; }
          .print-slips .sheet { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
          .print-slips .sheet:last-child { page-break-after: auto; break-after: auto; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-black/10">
        <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-black">
            <ArrowLeft className="w-4 h-4" /> Back to admin
          </Link>
          <p className="text-sm text-neutral-600">
            {loading ? 'Loading…' : `${orders.length} slip${orders.length === 1 ? '' : 's'} • ${pages.length} page${pages.length === 1 ? '' : 's'} (2 per A4)`}
          </p>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-black/15 p-0.5 text-sm font-semibold" role="group" aria-label="Print mode">
              {[
                { c: true, label: 'Colour' },
                { c: false, label: 'Black & White' },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setPrintMode(m.c)}
                  aria-pressed={color === m.c}
                  className={`px-3 py-1.5 rounded-md transition-colors ${color === m.c ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft(from);
                setEditing(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-black/15 hover:border-black text-sm font-semibold"
            >
              <Pencil className="w-4 h-4" /> Edit “From”
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || orders.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-40"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {editing && (
          <div className="border-t border-black/10 bg-[#FAF8F5]">
            <div className="max-w-[210mm] mx-auto px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Sender (“From”) details</p>
                <button type="button" onClick={() => setEditing(false)} className="p-1 text-neutral-500 hover:text-black" aria-label="Cancel">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {(
                  [
                    ['name', 'Name / Business'],
                    ['phone', 'Phone'],
                    ['address', 'Address'],
                    ['city', 'City'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="text-xs font-semibold text-neutral-600">{label}</span>
                    <input
                      value={draft[k]}
                      onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-black/15 bg-white focus:border-black outline-none"
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => saveFrom(false)} className="px-4 py-2 rounded-lg border border-black/15 hover:border-black text-sm font-semibold">
                  Use for this print only
                </button>
                <button
                  type="button"
                  onClick={() => saveFrom(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Save for all slips
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="no-print max-w-[210mm] mx-auto mt-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</p>}

      <div className="py-6 print:py-0">
        {pages.map((pair, i) => (
          <div className="sheet" key={i}>
            <Slip order={pair[0]} from={from} color={color} />
            <div className="cut">
              <span>✂ CUT HERE</span>
            </div>
            {pair[1] ? <Slip order={pair[1]} from={from} color={color} /> : <section className="slip" />}
          </div>
        ))}
      </div>
    </div>
  );
};
