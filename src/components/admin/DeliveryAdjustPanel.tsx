import React, { useEffect, useState } from 'react';
import { Truck, Bike, Store, Zap } from 'lucide-react';
import { apiRequest, formatPrice } from '../../lib/api';
import type { Order } from '../../types';
import { COURIERS, DELIVERY_METHODS, ShippingMethod } from './deliveryOptions';

const ICONS: Record<ShippingMethod, React.ElementType> = { standard: Truck, express: Zap, hand: Bike, pickup: Store };

interface Props {
  order: Order;
  onSaved: (order: Order) => void;
  onError: (msg: string) => void;
}

/** Order inspector section: change delivery method, charge, discount, rider and address. */
export const DeliveryAdjustPanel: React.FC<Props> = ({ order, onSaved, onError }) => {
  const [method, setMethod] = useState<ShippingMethod>(order.shippingMethod);
  const [charge, setCharge] = useState(order.shippingCost);
  const [discount, setDiscount] = useState(order.discountAmount);
  const [courier, setCourier] = useState(order.courierName || '');
  const [tracking, setTracking] = useState(order.trackingNumber || '');
  const [rider, setRider] = useState(order.deliveryPerson || '');
  const [riderPhone, setRiderPhone] = useState(order.deliveryPhone || '');
  const [phone, setPhone] = useState(order.shippingAddress.phone);
  const [street, setStreet] = useState(order.shippingAddress.streetAddress);
  const [city, setCity] = useState(order.shippingAddress.city);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMethod(order.shippingMethod);
    setCharge(order.shippingCost);
    setDiscount(order.discountAmount);
    setCourier(order.courierName || '');
    setTracking(order.trackingNumber || '');
    setRider(order.deliveryPerson || '');
    setRiderPhone(order.deliveryPhone || '');
    setPhone(order.shippingAddress.phone);
    setStreet(order.shippingAddress.streetAddress);
    setCity(order.shippingAddress.city);
  }, [order]);

  const newTotal = Math.max(0, order.subtotal - Math.min(discount, order.subtotal)) + charge + (order.taxAmount || 0);
  const isCourier = method === 'standard' || method === 'express';

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiRequest(`/api/admin/orders/${order._id}/delivery`, {
        method: 'PUT',
        body: JSON.stringify({
          shippingMethod: method,
          shippingCost: charge,
          discountAmount: discount,
          courierName: isCourier ? courier : '',
          trackingNumber: isCourier ? tracking : '',
          deliveryPerson: method === 'hand' ? rider : '',
          deliveryPhone: method === 'hand' ? riderPhone : '',
          address: { phone, streetAddress: street, city },
        }),
      });
      if (res.success) onSaved(res.order);
    } catch (err: any) {
      onError(err.message || 'Could not update delivery.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-neutral-300 rounded bg-white';

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-200 text-xs">
      <h4 className="font-bold uppercase tracking-wider">Delivery &amp; Charges</h4>

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
                if (m.value === 'pickup') setCharge(0);
              }}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-colors ${
                active ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#0D0D0D]' : 'border-neutral-300 text-neutral-600 hover:border-[#C5A059]'
              }`}
              title={m.hint}
            >
              <Icon className="w-4 h-4" />
              <span className="font-semibold">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="font-bold block mb-1">Delivery charge (PKR)</label>
          <input type="number" min={0} value={charge} onChange={(e) => setCharge(Math.max(0, Number(e.target.value)))} className={`${input} font-mono-code`} />
        </div>
        <div>
          <label className="font-bold block mb-1">Discount (PKR)</label>
          <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className={`${input} font-mono-code`} />
        </div>

        {isCourier && (
          <>
            <div>
              <label className="font-bold block mb-1">Courier</label>
              <input list="courier-list" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Leopards" className={input} />
              <datalist id="courier-list">
                {COURIERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="font-bold block mb-1">Tracking number</label>
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={`${input} font-mono-code`} />
            </div>
          </>
        )}

        {method === 'hand' && (
          <>
            <div>
              <label className="font-bold block mb-1">Rider / delivered by</label>
              <input value={rider} onChange={(e) => setRider(e.target.value)} placeholder="e.g. Bilal" className={input} />
            </div>
            <div>
              <label className="font-bold block mb-1">Rider phone</label>
              <input value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="03xx xxxxxxx" className={input} />
            </div>
          </>
        )}

        <div>
          <label className="font-bold block mb-1">Customer phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
        </div>
        <div>
          <label className="font-bold block mb-1">City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className="font-bold block mb-1">Delivery address</label>
          <input value={street} onChange={(e) => setStreet(e.target.value)} className={input} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#FAF8F5] border border-black/5">
        <span className="text-neutral-600">
          Items {formatPrice(order.subtotal)} − discount {formatPrice(Math.min(discount, order.subtotal))} + delivery {formatPrice(charge)}
        </span>
        <span className="font-bold text-sm text-[#0D0D0D] tabular-nums">
          New total {formatPrice(newTotal)}
          {newTotal !== order.totalAmount && (
            <span className="ml-1.5 font-normal text-neutral-400 line-through">{formatPrice(order.totalAmount)}</span>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 border border-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-[#FAF8F5] font-bold uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Delivery Changes'}
      </button>
    </div>
  );
};
