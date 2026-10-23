import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { Order } from '../../types';
import { apiRequest } from '../../lib/api';

interface ForceEditOrderModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedOrder: Order) => void;
  onError: (message: string) => void;
}

export const ForceEditOrderModal: React.FC<ForceEditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSaved,
  onError,
}) => {
  const [orderNumber, setOrderNumber] = useState(order.orderNumber);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<Order['fulfillmentStatus']>(order.fulfillmentStatus);
  const [paymentStatus, setPaymentStatus] = useState<Order['paymentStatus']>(order.paymentStatus);
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>(order.paymentMethod);
  const [shippingMethod, setShippingMethod] = useState<Order['shippingMethod']>(order.shippingMethod);

  // Customer shipping details
  const [fullName, setFullName] = useState(order.shippingAddress.fullName);
  const [phone, setPhone] = useState(order.shippingAddress.phone);
  const [email, setEmail] = useState(order.shippingAddress.email || '');
  const [streetAddress, setStreetAddress] = useState(order.shippingAddress.streetAddress);
  const [city, setCity] = useState(order.shippingAddress.city);
  const [province, setProvince] = useState(order.shippingAddress.province || '');
  const [postalCode, setPostalCode] = useState(order.shippingAddress.postalCode || '');
  const [notes, setNotes] = useState(order.shippingAddress.notes || '');

  // Financials
  const [subtotal, setSubtotal] = useState(order.subtotal);
  const [discountAmount, setDiscountAmount] = useState(order.discountAmount);
  const [shippingCost, setShippingCost] = useState(order.shippingCost);
  const [totalAmount, setTotalAmount] = useState(order.totalAmount);

  // Logistics
  const [courierName, setCourierName] = useState(order.courierName || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [deliveryPerson, setDeliveryPerson] = useState(order.deliveryPerson || '');
  const [deliveryPhone, setDeliveryPhone] = useState(order.deliveryPhone || '');

  // Admin Audit Note & Options
  const [adminReason, setAdminReason] = useState('');
  const [adjustStock, setAdjustStock] = useState(true);
  const [overwriteOrder, setOverwriteOrder] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleRecalculateTotal = () => {
    const calc = Math.max(0, subtotal - discountAmount) + shippingCost;
    setTotalAmount(calc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        orderNumber: orderNumber.trim().toUpperCase(),
        fulfillmentStatus,
        paymentStatus,
        paymentMethod,
        shippingMethod,
        customer: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          streetAddress: streetAddress.trim(),
          city: city.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
          notes: notes.trim(),
        },
        financials: {
          subtotal: Number(subtotal),
          discountAmount: Number(discountAmount),
          shippingCost: Number(shippingCost),
          totalAmount: Number(totalAmount),
        },
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
        deliveryPerson: deliveryPerson.trim(),
        deliveryPhone: deliveryPhone.trim(),
        adminReason: adminReason.trim() || 'Administrative modification',
        overwriteOrder,
        adjustStock,
      };

      const res = await apiRequest(`/api/admin/orders/${order._id}/force-update`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.success && res.order) {
        onSaved(res.order);
        onClose();
      } else {
        throw new Error(res.message || 'Failed to update order');
      }
    } catch (err: any) {
      onError(err.message || 'Could not forcefully update order.');
    } finally {
      setSaving(false);
    }
  };

  const isTransitioningFromCancelled =
    (order.fulfillmentStatus === 'cancelled' || order.fulfillmentStatus === 'refunded') &&
    !['cancelled', 'refunded'].includes(fulfillmentStatus);

  const isTransitioningToCancelled =
    !['cancelled', 'refunded'].includes(order.fulfillmentStatus) &&
    ['cancelled', 'refunded'].includes(fulfillmentStatus);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-black/10 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C5A059]/15 text-[#9E7B36] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#9E7B36]">
                  Master Admin Override
                </span>
                <span className="px-2 py-0.5 rounded bg-black text-[#FAF8F5] text-[10px] font-mono-code font-bold">
                  {order.orderNumber}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#0D0D0D]">Overwrite / Master Edit Order</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs flex-1">
          {/* Stock transition notices */}
          {isTransitioningFromCancelled && adjustStock && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Reopening Cancelled Order</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  This order was previously {order.fulfillmentStatus}. Changing to active will automatically re-allocate stock for its items from inventory.
                </p>
              </div>
            </div>
          )}

          {isTransitioningToCancelled && adjustStock && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Cancelling / Refunding Order</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Allocated stock for items in this order will automatically be returned to the vault.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Identification & Status */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#9E7B36] border-b border-neutral-100 pb-1">
              1. Order Identification & Status Control
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="font-bold block mb-1">Order ID</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MS-001"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono-code font-bold uppercase focus:ring-1 focus:ring-[#C5A059]"
                  required
                />
                <p className="text-[10px] text-neutral-400 mt-0.5">e.g. MS-001, MS-002...</p>
                <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteOrder}
                    onChange={(e) => setOverwriteOrder(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#C5A059] focus:ring-[#C5A059]"
                  />
                  <span className="text-[10px] text-neutral-600 font-semibold">
                    Overwrite if ID already exists
                  </span>
                </label>
              </div>

              <div>
                <label className="font-bold block mb-1">Fulfillment Status</label>
                <select
                  value={fulfillmentStatus}
                  onChange={(e) => setFulfillmentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-medium"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-medium"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-medium"
                >
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Customer & Shipping Details */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#9E7B36] border-b border-neutral-100 pb-1">
              2. Customer Contact & Delivery Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300 1234567"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono-code"
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Customer Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold block mb-1">Street Address</label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="House #, Street, Sector, Area..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lahore, Karachi, Islamabad..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Province / State</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Punjab, Sindh, KPK..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="54000"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Customer Delivery Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery timing, landmarks..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Totals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#9E7B36]">
                3. Financial Values & Amounts (PKR)
              </h4>
              <button
                type="button"
                onClick={handleRecalculateTotal}
                className="inline-flex items-center gap-1 text-[11px] text-[#9E7B36] hover:underline font-semibold"
              >
                <RefreshCw className="w-3 h-3" /> Auto-calculate Total
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold block mb-1">Subtotal (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={subtotal}
                  onChange={(e) => setSubtotal(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono-code font-semibold"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Discount (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono-code font-semibold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Shipping Fee (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono-code font-semibold"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Grand Total (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#C5A059] rounded-lg font-mono-code font-bold bg-[#FAF8F5] text-[#0D0D0D]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Dispatch & Tracking */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#9E7B36] border-b border-neutral-100 pb-1">
              4. Logistics & Courier Tracking
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="font-bold block mb-1">Shipping Method</label>
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-medium"
                >
                  <option value="standard">Courier (Standard)</option>
                  <option value="express">Courier (Express)</option>
                  <option value="hand">Hand Delivery (Own Rider)</option>
                  <option value="pickup">Store Pickup</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Courier Service</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="TCS, Leopards, Call Courier, PostEx..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 7729183921"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono-code"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Delivery Rider Name / Phone</label>
                <input
                  type="text"
                  value={deliveryPerson ? `${deliveryPerson}${deliveryPhone ? ` (${deliveryPhone})` : ''}` : ''}
                  onChange={(e) => setDeliveryPerson(e.target.value)}
                  placeholder="For hand delivery"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Admin Audit Reason & Stock Sync */}
          <div className="space-y-3 pt-2 border-t border-neutral-200">
            <div>
              <label className="font-bold block mb-1">
                Admin Reason / Audit Note <span className="text-neutral-400 font-normal">(Recorded in order timeline)</span>
              </label>
              <input
                type="text"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="e.g. Customer requested phone number change, manual order ID correction, reopening order..."
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={adjustStock}
                onChange={(e) => setAdjustStock(e.target.checked)}
                className="w-4 h-4 rounded text-[#C5A059] focus:ring-[#C5A059]"
              />
              <span className="font-semibold text-neutral-800">
                Automatically sync inventory stock on cancellation or reopening
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg border border-neutral-300 font-semibold hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Overwrite & Save Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
