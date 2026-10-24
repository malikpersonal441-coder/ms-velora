import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Plus, Minus, Trash2, Truck, Bike, Store, Zap, Gift } from 'lucide-react';
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

  const input = 'w-full px-3 py-2 border border-neutral-300 rounded bg-white';
  const label = 'font-bold block mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create order">
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto text-xs">
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#9E7B36] font-bold">Manual order</span>
            <h3 className="font-serif-luxury text-2xl font-bold text-[#0D0D0D]">Create Order</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-neutral-400 hover:text-black" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 1. Products */}
          <section className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider">1. Products</h4>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search product by name or SKU…"
                className={`${input} pl-9`}
              />
              {results.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-black/10 bg-white shadow-xl divide-y divide-black/5">
                  {results.map((p) => (
                    <li key={p._id}>
                      <button type="button" onClick={() => addProduct(p)} className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-[#FAF8F5]">
                        <img src={p.mainImage} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold truncate">{p.name}</span>
                          <span className="block text-neutral-500">{p.sku} • {p.stock} in stock{p.status !== 'published' ? ` • ${p.status}` : ''}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{formatPrice(listPrice(p))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addSurpriseGift}
                className="px-3 py-1.5 rounded-lg border border-[#C5A059] bg-[#FAF8F5] hover:bg-[#C5A059] text-[#0D0D0D] text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Gift className="w-3.5 h-3.5 text-[#9E7B36]" />
                <span>+ Add Surprise Gift (Free / Custom)</span>
              </button>
            </div>

            {lines.length === 0 ? (
              <p className="p-4 text-center text-neutral-400 border border-dashed border-neutral-300 rounded-lg">No products added yet.</p>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => {
                  const stock = stockOf(l.product, l.variantSku);
                  const short = Boolean(l.product && deductStock && l.quantity > stock);
                  return (
                    <li key={l.key} className={`flex flex-wrap items-center gap-3 p-2.5 rounded-lg border ${short ? 'border-red-300 bg-red-50' : 'border-black/10'}`}>
                      {l.product ? (
                        <img src={l.product.mainImage} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#C5A059]/15 text-[#9E7B36] flex items-center justify-center shrink-0">
                          <Gift className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {l.product ? (
                          <>
                            <p className="font-semibold truncate">{l.product.name}</p>
                            {l.product.variants.length > 0 ? (
                              <select
                                value={l.variantSku}
                                onChange={(e) => updateLine(l.key, { variantSku: e.target.value, unitPrice: listPrice(l.product, e.target.value) })}
                                className="mt-1 px-2 py-1 border border-neutral-300 rounded bg-white"
                              >
                                {l.product.variants.map((v) => (
                                  <option key={v.sku} value={v.sku}>
                                    {v.name} ({v.stock} left)
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className={short ? 'text-red-700' : 'text-neutral-500'}>{stock} in stock</p>
                            )}
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={l.customName || 'Surprise Gift'}
                              onChange={(e) => updateLine(l.key, { customName: e.target.value })}
                              placeholder="Surprise Gift or Custom Item"
                              className="font-semibold text-xs px-2 py-1 border border-neutral-300 rounded w-full"
                            />
                            <span className="text-[10px] text-amber-700 font-bold block mt-0.5">Surprise / Complimentary Gift</span>
                          </>
                        )}
                      </div>
                      <div className="inline-flex items-center border border-neutral-300 rounded bg-white overflow-hidden">
                        <button type="button" className="p-1.5 hover:bg-neutral-100" aria-label="Decrease" onClick={() => updateLine(l.key, { quantity: Math.max(1, l.quantity - 1) })}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-12 text-center font-bold text-xs tabular-nums border-x border-neutral-300 py-1 focus:outline-none"
                          aria-label="Quantity"
                        />
                        <button type="button" className="p-1.5 hover:bg-neutral-100" aria-label="Increase" onClick={() => updateLine(l.key, { quantity: l.quantity + 1 })}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <label className="flex items-center gap-1">
                        <span className="text-neutral-500 text-[11px]">Rs.</span>
                        <input
                          type="number"
                          min={0}
                          value={l.unitPrice}
                          onChange={(e) => updateLine(l.key, { unitPrice: Math.max(0, Number(e.target.value)) })}
                          className="w-20 px-2 py-1.5 border border-neutral-300 rounded font-mono-code text-xs"
                          aria-label="Unit price"
                        />
                      </label>
                      <div className="text-right min-w-20">
                        <span className="block text-[10px] text-neutral-400 uppercase font-semibold">Sub-price</span>
                        <span className="font-bold text-[#0D0D0D] font-mono-code text-xs">
                          {formatPrice(l.unitPrice * l.quantity)}
                        </span>
                      </div>
                      <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="p-1.5 text-neutral-400 hover:text-red-600" aria-label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <label className="inline-flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={deductStock} onChange={(e) => setDeductStock(e.target.checked)} />
              Deduct these items from stock
            </label>
          </section>

          {/* 2. Customer */}
          <section className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider">2. Customer</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Full name *</label>
                <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Phone *</label>
                <input required minLength={5} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Address {method !== 'pickup' && '*'}</label>
                <input required={method !== 'pickup'} value={street} onChange={(e) => setStreet(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>City {method !== 'pickup' && '*'}</label>
                <input required={method !== 'pickup'} value={city} onChange={(e) => setCity(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" className={input} />
              </div>
              <div>
                <label className={label}>Order came from</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={input}>
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Customer note</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gift wrap, landmark…" className={input} />
              </div>
            </div>
          </section>

          {/* 3. Delivery */}
          <section className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider">3. Delivery</h4>
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
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-colors ${
                      active ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#0D0D0D]' : 'border-neutral-300 text-neutral-600 hover:border-[#C5A059]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{m.label}</span>
                    <span className="text-[10px] text-neutral-500">{m.hint}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Delivery charge (PKR)</label>
                <input
                  type="number"
                  min={0}
                  value={deliveryCharge}
                  onChange={(e) => setCharge(Math.max(0, Number(e.target.value)))}
                  className={`${input} font-mono-code`}
                />
                {charge !== null && charge !== autoCharge && (
                  <button type="button" onClick={() => setCharge(null)} className="mt-1 text-[#9E7B36] font-semibold">
                    Reset to default ({formatPrice(autoCharge)})
                  </button>
                )}
              </div>
              <div>
                <label className={label}>Discount (PKR)</label>
                <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className={`${input} font-mono-code`} />
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
                    <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="optional" className={`${input} font-mono-code`} />
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
                    <input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="optional" className={input} />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 4. Payment & status */}
          <section className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider">4. Payment &amp; Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={label}>Payment method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={input}>
                  <option value="cod">Cash on Delivery</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                </select>
              </div>
              <div>
                <label className={label}>Payment</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as 'pending' | 'paid')} className={input}>
                  <option value="pending">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
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
              <div className="sm:col-span-3">
                <label className={label}>Internal note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Recorded in the order history" className={input} />
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-neutral-600 space-x-2">
            <span>Items {formatPrice(subtotal)}</span>
            {discount > 0 && <span>− {formatPrice(Math.min(discount, subtotal))}</span>}
            <span>+ delivery {formatPrice(deliveryCharge)}</span>
            <span className="block sm:inline font-bold text-base text-[#0D0D0D] tabular-nums">= {formatPrice(total)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-neutral-300 rounded-lg font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || lines.length === 0}
              className="px-6 py-2.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] rounded-lg font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
