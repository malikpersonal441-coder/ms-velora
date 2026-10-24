import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Plus, Minus, Trash2, Truck, Bike, Store, Zap, Gift, Package, ShoppingBag } from 'lucide-react';
import { apiRequest, formatPrice } from '../../lib/api';
import type { Order, Product } from '../../types';
import { COURIERS, DELIVERY_METHODS, DeliverySettings, ShippingMethod, defaultDeliveryCharge } from './deliveryOptions';

const ICONS: Record<ShippingMethod, React.ElementType> = { standard: Truck, express: Zap, hand: Bike, pickup: Store };
const CHANNELS = ['Phone call', 'WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Walk-in', 'Other'];

interface Line {
  key: string;
  product?: Product;
  customName?: string;
  isSurpriseGift?: boolean;
  variantSku?: string;
  quantity: number;
  unitPrice: number;
}

const listPrice = (p: Product, variantSku?: string) => {
  const v = variantSku ? p.variants.find((x) => x.sku === variantSku) : undefined;
  const regular = v?.price && v.price > 0 ? v.price : p.price;
  const sale = v && v.salePrice !== undefined ? v.salePrice : p.salePrice;
  return sale && sale > 0 && sale < regular ? sale : regular;
};
const stockOf = (p?: Product, variantSku?: string) => {
  if (!p) return 999;
  return variantSku ? p.variants.find((x) => x.sku === variantSku)?.stock ?? 0 : p.stock;
};

interface Props {
  onClose: () => void;
  onCreated: (order: Order) => void;
  onError: (msg: string) => void;
}

/** Admin: create an order by hand (phone / Instagram / walk-in) with any delivery method. */
export const CreateOrderModal: React.FC<Props> = ({ onClose, onCreated, onError }) => {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState('Phone call');

  const [method, setMethod] = useState<ShippingMethod>('standard');
  const [charge, setCharge] = useState<number | null>(null); // null = use default
  const [discount, setDiscount] = useState(0);
  const [courier, setCourier] = useState('Leopards');
  const [tracking, setTracking] = useState('');
  const [rider, setRider] = useState('');
  const [riderPhone, setRiderPhone] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [status, setStatus] = useState('confirmed');
  const [deductStock, setDeductStock] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest('/api/admin/settings')
      .then((r) => r.success && setSettings(r.settings))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      apiRequest(`/api/admin/products?q=${encodeURIComponent(q)}&status=all&limit=8`)
        .then((r) => setResults((r.products || []).filter((p: Product) => p.status !== 'archived')))
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addProduct = (p: Product) => {
    const variantSku = p.variants.length ? p.variants[0].sku : undefined;
    setLines((ls) => [...ls, { key: `${p._id}-${Date.now()}`, product: p, variantSku, quantity: 1, unitPrice: listPrice(p, variantSku) }]);
    setQuery('');
    setResults([]);
  };

  const addSurpriseGift = () => {
    setLines((ls) => [
      ...ls,
      {
        key: `surprise-${Date.now()}`,
        customName: 'Surprise Gift (Complimentary)',
        isSurpriseGift: true,
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };
  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0), [lines]);
  const discounted = Math.max(0, subtotal - discount);
  const autoCharge = defaultDeliveryCharge(method, discounted, settings);
  const deliveryCharge = charge ?? autoCharge;
  const total = discounted + deliveryCharge;
  const isCourier = method === 'standard' || method === 'express';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return onError('Add at least one product.');
    setSaving(true);
    try {
      const res = await apiRequest('/api/admin/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer: { fullName, phone, email, streetAddress: street, city, notes },
          items: lines.map((l) => ({
            productId: l.product ? l.product._id : undefined,
            name: l.product ? l.product.name : (l.customName || 'Surprise Gift'),
            isSurpriseGift: Boolean(l.isSurpriseGift),
            variantSku: l.variantSku,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          shippingMethod: method,
          shippingCost: deliveryCharge,
          discountAmount: discount,
          paymentMethod,
          paymentStatus,
          fulfillmentStatus: status,
          courierName: isCourier ? courier : '',
          trackingNumber: isCourier ? tracking : '',
          deliveryPerson: method === 'hand' ? rider : '',
          deliveryPhone: method === 'hand' ? riderPhone : '',
          manualChannel: channel,
          note,
          deductStock,
        }),
      });
      if (res.success) onCreated(res.order);
    } catch (err: any) {
      onError(err.message || 'Could not create order.');
    } finally {
      setSaving(false);
    }
  };

  const input =
    'w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-[#0D0D0D] placeholder:text-neutral-400 transition focus:outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/15';
  const label = 'block mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500';
  const card = 'rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6';
  const heading = (n: number, title: string, hint?: string) => (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-8 h-8 rounded-full bg-[#0D0D0D] text-[#C5A059] font-serif-luxury text-sm font-bold flex items-center justify-center shrink-0">{n}</span>
      <div>
        <h4 className="font-serif-luxury text-lg font-semibold leading-tight text-[#0D0D0D]">{title}</h4>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
    </div>
  );
  const pill = (active: boolean) =>
    `px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
      active ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-neutral-600 border-neutral-200 hover:border-[#C5A059]'
    }`;

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0D0D]/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Create order">
      <form onSubmit={submit} className="bg-[#FAF8F5] w-full sm:max-w-4xl h-[95vh] sm:h-auto sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-5 bg-white border-b border-neutral-200/80">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#0D0D0D] text-[#C5A059] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif-luxury text-2xl font-bold leading-tight text-[#0D0D0D]">Create Order</h3>
              <p className="text-xs text-neutral-500">For orders taken by phone, WhatsApp, Instagram or in person</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-5">
          {/* 1. Products */}
          <section className={card}>
            {heading(1, 'Products', 'Search your catalogue or add a free gift')}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product by name or SKU…"
                  className={`${input} pl-10`}
                />
                {results.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-2xl p-1.5">
                    {results.map((p) => (
                      <li key={p._id}>
                        <button type="button" onClick={() => addProduct(p)} className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-[#FAF8F5]">
                          <img src={p.mainImage} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold truncate text-[#0D0D0D]">{p.name}</span>
                            <span className="block text-[11px] text-neutral-500">
                              {p.sku} · {p.stock} in stock{p.status !== 'published' ? ` · ${p.status}` : ''}
                            </span>
                          </span>
                          <span className="text-sm font-bold font-mono-code tabular-nums">{formatPrice(listPrice(p))}</span>
                          <Plus className="w-4 h-4 text-[#9E7B36] shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={addSurpriseGift}
                className="px-4 py-2.5 rounded-xl border border-dashed border-[#C5A059] text-[#9E7B36] hover:bg-[#C5A059]/10 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <Gift className="w-4 h-4" />
                Add Free Gift
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="mt-4 py-8 text-center rounded-2xl border border-dashed border-neutral-300 bg-[#FAF8F5]">
                <Package className="w-7 h-7 mx-auto text-neutral-300" />
                <p className="mt-2 text-sm text-neutral-500">No products yet. Search above to add one.</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {lines.map((l) => {
                  const stock = stockOf(l.product, l.variantSku);
                  const short = Boolean(l.product && deductStock && l.quantity > stock);
                  return (
                    <li key={l.key} className={`flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-2xl border ${short ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-[#FAF8F5]'}`}>
                      {l.product ? (
                        <img src={l.product.mainImage} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#C5A059]/15 text-[#9E7B36] flex items-center justify-center shrink-0">
                          <Gift className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {l.product ? (
                          <>
                            <p className="text-sm font-semibold truncate text-[#0D0D0D]">{l.product.name}</p>
                            {l.product.variants.length > 0 ? (
                              <select
                                value={l.variantSku}
                                onChange={(e) => updateLine(l.key, { variantSku: e.target.value, unitPrice: listPrice(l.product!, e.target.value) })}
                                className="mt-1 px-2 py-1 text-xs border border-neutral-200 rounded-lg bg-white"
                              >
                                {l.product.variants.map((v) => (
                                  <option key={v.sku} value={v.sku}>
                                    {v.name} ({v.stock} left)
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className={`text-[11px] ${short ? 'text-red-700 font-semibold' : 'text-neutral-500'}`}>
                                {short ? `Only ${stock} in stock` : `${stock} in stock`}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={l.customName || 'Surprise Gift'}
                              onChange={(e) => updateLine(l.key, { customName: e.target.value })}
                              placeholder="Surprise Gift or Custom Item"
                              className="w-full text-sm font-semibold px-2.5 py-1.5 border border-neutral-200 rounded-lg bg-white"
                            />
                            <span className="text-[10px] text-[#9E7B36] font-bold uppercase tracking-wider block mt-1">Complimentary gift</span>
                          </>
                        )}
                      </div>
                      <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white">
                        <button type="button" className="w-8 h-8 flex items-center justify-center hover:text-[#9E7B36]" aria-label="Decrease" onClick={() => updateLine(l.key, { quantity: Math.max(1, l.quantity - 1) })}>
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-9 text-center text-sm font-bold tabular-nums bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          aria-label="Quantity"
                        />
                        <button type="button" className="w-8 h-8 flex items-center justify-center hover:text-[#9E7B36]" aria-label="Increase" onClick={() => updateLine(l.key, { quantity: l.quantity + 1 })}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">Rs.</span>
                        <input
                          type="number"
                          min={0}
                          value={l.unitPrice}
                          onChange={(e) => updateLine(l.key, { unitPrice: Math.max(0, Number(e.target.value)) })}
                          className="w-full pl-8 pr-2 py-2 text-sm border border-neutral-200 rounded-lg bg-white font-mono-code"
                          aria-label="Unit price"
                        />
                      </div>
                      <span className="w-24 text-right text-sm font-bold font-mono-code text-[#0D0D0D] tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
                      <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50" aria-label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <label className="mt-4 inline-flex items-center gap-2.5 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={deductStock} onChange={(e) => setDeductStock(e.target.checked)} className="w-4 h-4 accent-[#9E7B36]" />
              Deduct these items from stock
            </label>
          </section>

          {/* 2. Customer */}
          <section className={card}>
            {heading(2, 'Customer', 'Who is this order for?')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Full name *</label>
                <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Customer name" className={input} />
              </div>
              <div>
                <label className={label}>Phone *</label>
                <input required minLength={5} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" className={`${input} font-mono-code`} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Address {method !== 'pickup' && '*'}</label>
                <input required={method !== 'pickup'} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="House, street, area" className={input} />
              </div>
              <div>
                <label className={label}>City {method !== 'pickup' && '*'}</label>
                <input required={method !== 'pickup'} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lahore" className={input} />
              </div>
              <div>
                <label className={label}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Order came from</label>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <button key={c} type="button" onClick={() => setChannel(c)} className={pill(channel === c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Customer note</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gift wrap, landmark…" className={input} />
              </div>
            </div>
          </section>

          {/* 3. Delivery */}
          <section className={card}>
            {heading(3, 'Delivery', 'How the parcel reaches the customer')}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DELIVERY_METHODS.map((m) => {
                const Icon = ICONS[m.value];
                const active = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setMethod(m.value);
                      setCharge(null);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border text-center transition-all ${
                      active ? 'border-[#C5A059] bg-[#C5A059]/10 ring-4 ring-[#C5A059]/10' : 'border-neutral-200 hover:border-[#C5A059]/60'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-[#0D0D0D] text-[#C5A059]' : 'bg-neutral-100 text-neutral-500'}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-semibold text-[#0D0D0D]">{m.label}</span>
                    <span className="text-[10px] text-neutral-500 leading-tight">{m.hint}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Delivery charge</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">Rs.</span>
                  <input
                    type="number"
                    min={0}
                    value={deliveryCharge}
                    onChange={(e) => setCharge(Math.max(0, Number(e.target.value)))}
                    className={`${input} pl-11 font-mono-code`}
                  />
                </div>
                {charge !== null && charge !== autoCharge && (
                  <button type="button" onClick={() => setCharge(null)} className="mt-1.5 text-xs text-[#9E7B36] font-semibold">
                    Reset to default ({formatPrice(autoCharge)})
                  </button>
                )}
              </div>
              <div>
                <label className={label}>Discount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">Rs.</span>
                  <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className={`${input} pl-11 font-mono-code`} />
                </div>
              </div>
              {isCourier && (
                <>
                  <div>
                    <label className={label}>Courier</label>
                    <input list="create-courier-list" value={courier} onChange={(e) => setCourier(e.target.value)} className={input} />
                    <datalist id="create-courier-list">
                      {COURIERS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className={label}>Tracking number</label>
                    <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Optional" className={`${input} font-mono-code`} />
                  </div>
                </>
              )}
              {method === 'hand' && (
                <>
                  <div>
                    <label className={label}>Rider / delivered by</label>
                    <input value={rider} onChange={(e) => setRider(e.target.value)} placeholder="e.g. Bilal" className={input} />
                  </div>
                  <div>
                    <label className={label}>Rider phone</label>
                    <input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="Optional" className={input} />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 4. Payment & status */}
          <section className={card}>
            {heading(4, 'Payment & Status')}
            <div className="space-y-4">
              <div>
                <label className={label}>Payment method</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['cod', 'Cash on Delivery'],
                    ['bank_transfer', 'Bank Transfer'],
                    ['jazzcash', 'JazzCash'],
                    ['easypaisa', 'EasyPaisa'],
                  ].map(([v, t]) => (
                    <button key={v} type="button" onClick={() => setPaymentMethod(v)} className={pill(paymentMethod === v)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Payment</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-xl">
                    {(['pending', 'paid'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPaymentStatus(v)}
                        className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                          paymentStatus === v ? (v === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-[#0D0D0D] shadow-sm') : 'text-neutral-500'
                        }`}
                      >
                        {v === 'paid' ? 'Paid' : 'Unpaid'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={label}>Order status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped / out for delivery</option>
                    <option value="delivered">Delivered (handed over)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>Internal note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only you can see this — saved in the order history" className={input} />
              </div>
            </div>
          </section>
        </div>

        {/* Footer: running total */}
        <div className="bg-white border-t border-neutral-200/80 px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-end justify-between sm:justify-start gap-5">
            <div className="text-[11px] text-neutral-500 leading-relaxed">
              <div>Items <span className="font-mono-code text-neutral-700">{formatPrice(subtotal)}</span></div>
              {discount > 0 && <div>Discount <span className="font-mono-code text-emerald-700">−{formatPrice(Math.min(discount, subtotal))}</span></div>}
              <div>Delivery <span className="font-mono-code text-neutral-700">{formatPrice(deliveryCharge)}</span></div>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-neutral-500 font-semibold">Total</span>
              <span className="font-mono-code text-2xl font-bold text-[#0D0D0D] tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || lines.length === 0}
              className="flex-1 sm:flex-none px-7 py-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] rounded-xl text-sm font-bold uppercase tracking-wider transition-colors shadow-lg disabled:opacity-40 disabled:hover:bg-[#0D0D0D] disabled:hover:text-[#FAF8F5]"
            >
              {saving ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
