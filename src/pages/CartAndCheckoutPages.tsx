import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Tag,
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Printer,
  Package,
  Search,
  CreditCard,
  Banknote,
  Building2,
  MessageCircle,
} from 'lucide-react';
import { z } from 'zod';
import { useStore } from '../context/StoreContext';
import {
  apiRequest,
  formatPrice,
  formatDateTime,
  PAKISTAN_PROVINCES,
} from '../lib/api';
import { Order } from '../types';
import { customerOrderMessage, waLink } from '../lib/whatsapp';
import { WalletPaymentModal, isWalletMethod } from '../components/WalletPaymentModal';

export const CartPage: React.FC = () => {
  const {
    cartItems,
    cartSummary,
    updateCartQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
    shippingMethod,
    setShippingMethod,
    settings,
  } = useStore();
  const [couponInput, setCouponInput] = useState('');
  const navigate = useNavigate();
  const symbol = cartSummary.currencySymbol || 'Rs.';

  useEffect(() => {
    document.title = 'Shopping Bag — MS Velora';
  }, []);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-[#F3EFE6] flex items-center justify-center mx-auto text-[#9E7B36]">
          <ShoppingBag className="w-9 h-9" />
        </div>
        <h1 className="font-serif-luxury text-4xl font-semibold text-[#0D0D0D]">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          Explore our necklaces, earrings, rings and bridal sets.
        </p>
        <Link
          to="/shop"
          className="inline-block px-8 py-4 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-[0.2em] font-semibold rounded transition-colors"
        >
          Explore Jewellery
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <h1 className="font-serif-luxury text-4xl font-semibold text-[#0D0D0D] mb-8">
        Your Shopping Bag ({cartItems.reduce((a, b) => a + b.quantity, 0)})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Items Table */}
        <div className="lg:col-span-8 space-y-4">
          {cartItems.map((item) => (
            <div
              key={`${item.productId}-${item.variantSku || 'base'}`}
              className="bg-white p-5 rounded-xl border border-black/8 flex flex-col sm:flex-row items-start sm:items-center gap-5"
            >
              <Link
                to={`/product/${item.slug}`}
                className="w-24 h-28 rounded-lg bg-[#F3EFE6] overflow-hidden shrink-0"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[11px] uppercase tracking-widest text-[#9E7B36] font-semibold">
                  {item.brand}
                </span>
                <Link
                  to={`/product/${item.slug}`}
                  className="block font-serif-luxury text-xl font-semibold text-[#0D0D0D] hover:text-[#9E7B36]"
                >
                  {item.name}
                </Link>
                {item.variantName && (
                  <p className="text-xs text-neutral-500">Edition: {item.variantName}</p>
                )}
                <p className="text-xs font-mono-code text-neutral-500">
                  Unit Price: {formatPrice(item.effectivePrice, symbol)}
                </p>
                {item.stockWarning && (
                  <p className="text-xs text-amber-700 font-semibold">{item.stockWarning}</p>
                )}
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="flex items-center border border-neutral-300 rounded">
                  <button
                    type="button"
                    onClick={() =>
                      updateCartQuantity(item.productId, item.quantity - 1, item.variantSku)
                    }
                    className="px-3 py-1.5 text-sm font-bold hover:bg-neutral-100"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-sm font-semibold font-mono-code">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateCartQuantity(
                        item.productId,
                        Math.min(item.availableStock, item.quantity + 1),
                        item.variantSku
                      )
                    }
                    className="px-3 py-1.5 text-sm font-bold hover:bg-neutral-100"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-[100px]">
                  <span className="font-mono-code text-base font-bold text-[#0D0D0D]">
                    {formatPrice(item.subtotal, symbol)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId, item.variantSku)}
                  className="p-2 text-neutral-400 hover:text-red-600"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-xl border border-black/8 space-y-5 sticky top-28">
            <h2 className="font-serif-luxury text-2xl font-semibold border-b border-neutral-200 pb-3">
              Order Summary
            </h2>

            {/* Shipping Method Preview */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-neutral-600 block">
                Shipping Option
              </span>
              <label className="flex items-center justify-between p-3 rounded border border-neutral-200 cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                    className="accent-[#0D0D0D]"
                  />
                  <span>Standard Insured (2–4 Days)</span>
                </div>
                <span className="font-mono-code font-semibold">
                  {cartSummary.subtotal - cartSummary.discountAmount >=
                  cartSummary.freeShippingThreshold
                    ? 'FREE'
                    : formatPrice(settings?.standardShippingFee ?? 350, symbol)}
                </span>
              </label>
              <label className="flex items-center justify-between p-3 rounded border border-neutral-200 cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="accent-[#0D0D0D]"
                  />
                  <span>Express Air Courier (24–48h)</span>
                </div>
                <span className="font-mono-code font-semibold">
                  {formatPrice(settings?.expressShippingFee ?? 750, symbol)}
                </span>
              </label>
            </div>

            {/* Coupon */}
            {cartSummary.couponCode ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> {cartSummary.couponCode} Applied
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-red-600 font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  applyCoupon(couponInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Promo code (ROYAL10)"
                  className="flex-1 px-3 py-2.5 text-xs border border-neutral-300 rounded font-mono-code uppercase"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded"
                >
                  Apply
                </button>
              </form>
            )}

            <div className="space-y-2 text-sm pt-2 border-t border-neutral-200">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-mono-code">{formatPrice(cartSummary.subtotal, symbol)}</span>
              </div>
              {cartSummary.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span className="font-mono-code">
                    -{formatPrice(cartSummary.discountAmount, symbol)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Insured Delivery</span>
                <span className="font-mono-code">
                  {cartSummary.shippingCost === 0
                    ? 'Complimentary'
                    : formatPrice(cartSummary.shippingCost, symbol)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#0D0D0D] pt-3 border-t border-neutral-200">
                <span>Total (PKR)</span>
                <span className="font-mono-code">
                  {formatPrice(cartSummary.totalAmount, symbol)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] font-bold text-xs uppercase tracking-[0.2em] rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const checkoutFormSchema = z.object({
  fullName: z.string().min(2, 'Recipient full name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    // Accept any common spacing: 0301-7713866, +92 300 0000000, 92 301 7713866…
    .transform((v) => v.replace(/[\s()-]/g, ''))
    .refine(
      (v) => /^(\+92|0092|92|0)?3\d{9}$/.test(v),
      'Enter a valid Pakistani mobile number (e.g., 0300 1234567 or +92 300 1234567)'
    ),
  streetAddress: z.string().min(5, 'Complete house/office street address is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  notes: z.string().optional(),
});

export const CheckoutPage: React.FC = () => {
  const {
    user,
    rawCart,
    cartItems,
    cartSummary,
    shippingMethod,
    setShippingMethod,
    couponCode,
    applyCoupon,
    removeCoupon,
    clearCart,
    settings,
    addToast,
  } = useStore();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [province, setProvince] = useState('Punjab');
  const [postalCode, setPostalCode] = useState('54000');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer' | 'online'>('cod');
  const [couponInput, setCouponInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(
    () => `bfs-chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    document.title = 'Checkout — MS Velora';
    setShippingMethod('standard'); // single delivery option at checkout
    if (user) {
      setFullName((prev) => prev || user.name);
      setEmail((prev) => prev || user.email);
      setPhone((prev) => prev || user.phone);
      const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      if (defaultAddr && !streetAddress) {
        setFullName(defaultAddr.fullName);
        setPhone(defaultAddr.phone);
        setStreetAddress(defaultAddr.streetAddress);
        setCity(defaultAddr.city);
        setProvince(defaultAddr.province);
        setPostalCode(defaultAddr.postalCode);
      }
    }
  }, [user, streetAddress]);

  const symbol = cartSummary.currencySymbol || 'Rs.';

  if (cartItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif-luxury text-3xl font-semibold">Your Bag is Empty</h1>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-widest rounded"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const whatsappOrdering = Boolean(settings?.whatsappNumber) && settings?.whatsappOrderingEnabled !== false;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const viaWhatsApp = whatsappOrdering && submitter?.value === 'whatsapp';
    // Open the tab synchronously (inside the click) so popup blockers allow it
    const waWindow = viaWhatsApp ? window.open('', '_blank') : null;
    try {
      const validatedAddress = checkoutFormSchema.parse({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        streetAddress: streetAddress.trim(),
        city: city.trim(),
        province,
        postalCode: postalCode.trim(),
        notes: notes.trim(),
      });

      setSubmitting(true);
      const res = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          items: rawCart,
          shippingAddress: {
            ...validatedAddress,
            country: 'Pakistan',
          },
          shippingMethod,
          paymentMethod,
          couponCode: couponCode || undefined,
          orderSource: viaWhatsApp ? 'whatsapp' : 'website',
        }),
      });

      if (res.success && res.order) {
        if (viaWhatsApp && settings?.whatsappNumber) {
          const link = waLink(settings.whatsappNumber, customerOrderMessage(res.order, settings));
          if (waWindow) waWindow.location.href = link;
          else window.open(link, '_blank');
        }

        clearCart();
        addToast(
          viaWhatsApp
            ? `Order ${res.order.orderNumber} placed — send the WhatsApp message to confirm.`
            : `Order ${res.order.orderNumber} received — we'll confirm it shortly.`,
          'success'
        );
        // Back to the homepage; the "order placed" window (with payment details for online
        // orders) opens there via router state
        navigate('/', { replace: true, state: { placedOrder: res.order } });
      }
    } catch (err: any) {
      waWindow?.close();
      // Show the first readable validation message instead of raw JSON
      const friendly = err instanceof z.ZodError ? err.issues[0]?.message : err?.message;
      addToast(friendly || 'Could not complete order. Please check your details.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <div className="mb-8">
        <span className="text-xs uppercase tracking-[0.22em] text-[#9E7B36] font-semibold">
          Checkout
        </span>
        <h1 className="font-serif-luxury text-4xl font-semibold text-[#0D0D0D]">
          Checkout
        </h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Customer & Delivery Details */}
        <div className="lg:col-span-7 space-y-8">
          {/* Saved Addresses Selector for Authenticated Users */}
          {user && user.addresses && user.addresses.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-3">
              <h2 className="text-xs uppercase tracking-[0.18em] font-bold text-[#9E7B36]">
                Select From Saved Addresses
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.addresses.map((addr) => (
                  <button
                    key={addr._id}
                    type="button"
                    onClick={() => {
                      setFullName(addr.fullName);
                      setPhone(addr.phone);
                      setStreetAddress(addr.streetAddress);
                      setCity(addr.city);
                      setProvince(addr.province);
                      setPostalCode(addr.postalCode);
                    }}
                    className="p-3.5 text-left rounded-lg border border-neutral-200 hover:border-[#C5A059] bg-[#FAF8F5] text-xs space-y-1 transition-colors"
                  >
                    <span className="font-bold text-[#0D0D0D] block">
                      {addr.label} — {addr.fullName}
                    </span>
                    <span className="text-neutral-600 block truncate">{addr.streetAddress}</span>
                    <span className="text-neutral-500 block">
                      {addr.city}, {addr.province} • {addr.phone}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recipient & Delivery Address */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-black/8 space-y-5">
            <h2 className="font-serif-luxury text-2xl font-semibold text-[#0D0D0D] border-b border-neutral-200 pb-3">
              1. Recipient & Delivery Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0D0D0D]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collector@example.com"
                  className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0D0D0D]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Pakistani Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300 1234567 or +92 300 1234567"
                  className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0D0D0D]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Complete Street Address (House / Apartment / Sector) *
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="House 14-C, Street 8, Phase 5 DHA"
                  className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0D0D0D]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Province / Region *
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-[#0D0D0D]"
                >
                  {PAKISTAN_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lahore / Karachi / Islamabad"
                  className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0D0D0D]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Postal Code *
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="54000"
                  className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0D0D0D]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  disabled
                  value="Pakistan"
                  className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-lg bg-neutral-100 text-neutral-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Delivery / Gift Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional gift note or preferred delivery hours..."
                  className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0D0D0D]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method (No raw card storage!) */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-black/8 space-y-4">
            <h2 className="font-serif-luxury text-2xl font-semibold text-[#0D0D0D] border-b border-neutral-200 pb-3">
              2. Payment Method
            </h2>

            <div className="space-y-3">
              {settings?.enableCod !== false && (
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-[#0D0D0D] bg-[#FAF8F5]'
                      : 'border-neutral-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-1 accent-[#0D0D0D]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Banknote className="w-4 h-4 text-[#9E7B36]" />
                      <span>Cash on Delivery (COD)</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Pay in Pakistani Rupees (PKR) upon receiving your parcel.
                    </p>
                  </div>
                </label>
              )}

              {(settings?.mobileWallets?.jazzcash?.enabled !== false || settings?.mobileWallets?.easypaisa?.enabled !== false) && (
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    paymentMethod === 'online' ? 'border-[#0D0D0D] bg-[#FAF8F5]' : 'border-neutral-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    className="mt-1 accent-[#0D0D0D]"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-sm">
                      <span>Online Payment</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#C8102E] text-white text-[9px] font-bold">JazzCash</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#1BA548] text-white text-[9px] font-bold">EasyPaisa</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      After placing the order you'll see our account number. Send the amount and share the screenshot on WhatsApp.
                    </p>
                  </div>
                </label>
              )}

              {settings?.enableBankTransfer !== false && (
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#0D0D0D] bg-[#FAF8F5]'
                      : 'border-neutral-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="mt-1 accent-[#0D0D0D]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Building2 className="w-4 h-4 text-[#9E7B36]" />
                      <span>Direct Bank / IBFT Transfer</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {settings?.bankDetails ||
                        'Bank details will be shared on WhatsApp.'}
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-black/8 space-y-6 sticky top-28">
            <h2 className="font-serif-luxury text-2xl font-semibold border-b border-neutral-200 pb-3">
              Order Summary
            </h2>

            <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div
                  key={`${item.productId}-${item.variantSku || 'base'}`}
                  className="py-3 flex items-center gap-3.5"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-16 rounded object-cover bg-[#F3EFE6] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif-luxury text-base font-semibold truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Qty: {item.quantity} {item.variantName ? `• ${item.variantName}` : ''}
                    </p>
                  </div>
                  <div className="font-mono-code text-xs font-bold">
                    {formatPrice(item.subtotal, symbol)}
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code */}
            {cartSummary.couponCode ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <span className="font-semibold text-emerald-800">
                  Promo {cartSummary.couponCode} (-{formatPrice(cartSummary.discountAmount, symbol)})
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-red-600 font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Privilege Code (e.g. ROYAL10)"
                  className="flex-1 px-3.5 py-2.5 text-xs border border-neutral-300 rounded font-mono-code uppercase"
                />
                <button
                  type="button"
                  onClick={() => applyCoupon(couponInput)}
                  className="px-4 py-2.5 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded"
                >
                  Apply
                </button>
              </div>
            )}

            <div className="space-y-2 text-sm pt-2 border-t border-neutral-200">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-mono-code">{formatPrice(cartSummary.subtotal, symbol)}</span>
              </div>
              {cartSummary.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span className="font-mono-code">
                    -{formatPrice(cartSummary.discountAmount, symbol)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Insured Shipping</span>
                <span className="font-mono-code">
                  {cartSummary.shippingCost === 0
                    ? 'Complimentary'
                    : formatPrice(cartSummary.shippingCost, symbol)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold text-[#0D0D0D] pt-3 border-t border-neutral-200">
                <span>Total</span>
                <span className="font-mono-code">
                  {formatPrice(cartSummary.totalAmount, symbol)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] font-bold text-xs uppercase tracking-[0.2em] rounded-lg transition-colors shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Placing your order…' : 'Place Order'}
            </button>

            {whatsappOrdering && (
              <>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-neutral-400">
                  <span className="h-px flex-1 bg-neutral-200" />
                  or
                  <span className="h-px flex-1 bg-neutral-200" />
                </div>
                <button
                  type="submit"
                  value="whatsapp"
                  disabled={submitting}
                  className="group w-full py-4 bg-[#25D366] hover:bg-[#1EBE5A] text-[#0D0D0D] font-bold text-xs uppercase tracking-[0.2em] rounded-lg transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2.5"
                >
                  <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Order via WhatsApp</span>
                </button>
                <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                  We save your order, then WhatsApp opens with the details so you can confirm it with us.
                </p>
              </>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-[#9E7B36]" />
              <span>Secure checkout • 2-year warranty included</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useStore();
  const [searchParams] = useSearchParams();
  const [payOpen, setPayOpen] = useState(searchParams.get('pay') === '1');

  useEffect(() => {
    async function fetchOrder() {
      if (!orderNumber) return;
      try {
        setLoading(true);
        const res = await apiRequest(`/api/orders/track/${orderNumber}`);
        if (res.success) {
          setOrder(res.order);
          document.title = `Order ${res.order.orderNumber} Confirmed — MS Velora`;
        }
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center text-sm uppercase tracking-widest text-neutral-500">
        Loading your order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif-luxury text-3xl font-semibold">Order Not Found</h1>
        <Link
          to="/track-order"
          className="inline-block px-6 py-3 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-widest rounded"
        >
          Look Up Another Order
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <div className="bg-white rounded-2xl border border-[#C5A059]/40 shadow-xl overflow-hidden">
        <div className="bg-[#0D0D0D] text-[#FAF8F5] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C5A059]/30">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Order Receipt</span>
            </div>
            <h1 className="font-serif-luxury text-3xl sm:text-4xl font-semibold">
              Thank You, {order.shippingAddress.fullName}
            </h1>
            <p className="text-xs text-[#FAF8F5]/70">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase tracking-widest text-[#FAF8F5]/60 block">
              Order Number
            </span>
            <span className="font-mono-code text-xl font-bold text-[#C5A059]">
              {order.orderNumber}
            </span>
            <div className="mt-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-[#C5A059] hover:text-[#0D0D0D] text-xs font-medium transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* JazzCash / EasyPaisa: payment still to be sent */}
          {isWalletMethod(order.paymentMethod) && order.paymentStatus !== 'paid' && (
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/50">
              <div className="text-sm">
                <p className="font-semibold text-[#0D0D0D]">
                  Payment pending — {order.paymentMethod === 'jazzcash' ? 'JazzCash' : order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'Online Payment'}
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Send {formatPrice(order.totalAmount)} and share the screenshot on WhatsApp to confirm your order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-bold transition-colors"
              >
                Pay Now
              </button>
            </div>
          )}
          {payOpen && <WalletPaymentModal order={order} settings={settings} onClose={() => setPayOpen(false)} />}

          {/* WhatsApp order: let the customer (re)open the confirmation chat */}
          {order.orderSource === 'whatsapp' && settings?.whatsappNumber && (
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/40">
              <div className="text-sm">
                <p className="font-semibold text-[#0D0D0D]">Confirm your order on WhatsApp</p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  If WhatsApp didn't open, tap the button — your order details are already written for you.
                </p>
              </div>
              <a
                href={waLink(settings.whatsappNumber, customerOrderMessage(order, settings))}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#25D366] hover:bg-[#1EBE5A] text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp
              </a>
            </div>
          )}

          {/* Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-black/8 text-xs">
            <div>
              <span className="text-neutral-500 uppercase tracking-wider block">
                Fulfillment Status
              </span>
              <span className="font-bold text-sm uppercase text-[#0D0D0D] mt-0.5 block">
                {order.fulfillmentStatus}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 uppercase tracking-wider block">
                Payment Status
              </span>
              <span className="font-bold text-sm uppercase text-[#0D0D0D] mt-0.5 block">
                {order.paymentStatus} ({order.paymentMethod.toUpperCase()})
              </span>
            </div>
            <div>
              <span className="text-neutral-500 uppercase tracking-wider block">
                Delivery Destination
              </span>
              <span className="font-semibold text-[#0D0D0D] mt-0.5 block">
                {order.shippingAddress.city}, {order.shippingAddress.province}
              </span>
            </div>
          </div>

          {/* Ordered Items */}
          <div className="space-y-3">
            <h2 className="font-serif-luxury text-xl font-semibold">Items Ordered</h2>
            <div className="divide-y divide-neutral-200 border rounded-xl border-neutral-200 overflow-hidden">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between gap-4 bg-white">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-16 rounded object-cover bg-[#F3EFE6]"
                    />
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#9E7B36] font-semibold">
                        {item.brand}
                      </p>
                      <h4 className="font-serif-luxury text-lg font-semibold text-[#0D0D0D]">
                        {item.name}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="font-mono-code font-bold text-sm">
                    {formatPrice(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-neutral-200">
            <div className="space-y-2 text-xs">
              <h3 className="uppercase tracking-wider font-bold text-[#0D0D0D] text-sm">
                Delivery Address
              </h3>
              <p className="font-semibold text-[#0D0D0D]">{order.shippingAddress.fullName}</p>
              <p className="text-neutral-600">{order.shippingAddress.streetAddress}</p>
              <p className="text-neutral-600">
                {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-neutral-600">Phone: {order.shippingAddress.phone}</p>
              <p className="text-neutral-600">Email: {order.shippingAddress.email}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-mono-code">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount ({order.couponCode})</span>
                  <span className="font-mono-code">-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Shipping ({order.shippingMethod})</span>
                <span className="font-mono-code">
                  {order.shippingCost === 0 ? 'Complimentary' : formatPrice(order.shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#0D0D0D] pt-2 border-t border-neutral-200">
                <span>Total Amount</span>
                <span className="font-mono-code">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 no-print">
            <Link
              to={`/track-order?orderNumber=${order.orderNumber}`}
              className="px-6 py-3 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-widest font-semibold rounded"
            >
              Track Order Status
            </Link>
            <Link
              to="/shop"
              className="px-6 py-3 border border-[#0D0D0D] text-[#0D0D0D] text-xs uppercase tracking-widest font-semibold rounded"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TrackOrderPage: React.FC = () => {
  const [orderNumInput, setOrderNumInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumInput.trim()) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest(
        `/api/orders/track/${encodeURIComponent(orderNumInput.trim().toUpperCase())}`
      );
      if (res.success) {
        setOrder(res.order);
      }
    } catch (err: any) {
      setOrder(null);
      setError(err.message || 'No order found with that reference number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Track Your Order — MS Velora';
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('orderNumber');
    if (initial) {
      setOrderNumInput(initial);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24 space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs uppercase tracking-[0.24em] text-[#9E7B36] font-semibold">
          Insured Logistics Tracking
        </span>
        <h1 className="font-serif-luxury text-4xl font-semibold text-[#0D0D0D]">
          Track Your Order
        </h1>
        <p className="text-sm text-neutral-500">
          Enter your MS Velora order number (e.g., <code className="font-mono-code">MS-001</code>) to inspect live fulfillment milestones.
        </p>
      </div>

      <form
        onSubmit={handleLookup}
        className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
      >
        <input
          type="text"
          value={orderNumInput}
          onChange={(e) => setOrderNumInput(e.target.value.toUpperCase())}
          placeholder="Order Reference (e.g. MS-001)"
          className="flex-1 px-4 py-3.5 bg-white border border-neutral-300 rounded-lg font-mono-code text-sm uppercase focus:outline-none focus:border-[#0D0D0D]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-7 py-3.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-[0.2em] font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Searching...' : 'Track Order'}</span>
        </button>
      </form>

      {error && (
        <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      {order && (
        <div className="bg-white rounded-2xl border border-black/10 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
            <div>
              <span className="text-xs text-neutral-400 uppercase tracking-wider block">
                Order Reference
              </span>
              <h2 className="font-mono-code text-2xl font-bold text-[#0D0D0D]">
                {order.orderNumber}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#0D0D0D] text-[#C5A059] text-xs font-bold uppercase tracking-wider">
                {order.fulfillmentStatus}
              </span>
              <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold uppercase tracking-wider">
                Payment: {order.paymentStatus}
              </span>
            </div>
          </div>

          {order.trackingNumber && (
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#C5A059]/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-[#9E7B36]" />
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-[#9E7B36]">
                    Courier Partner: {order.courierName || 'Insured Express'}
                  </p>
                  <p className="text-sm font-mono-code font-bold text-[#0D0D0D]">
                    Tracking Number: {order.trackingNumber}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chronological Timeline */}
          <div className="space-y-4">
            <h3 className="font-serif-luxury text-xl font-semibold">
              Chronological Status History
            </h3>
            <div className="space-y-3 border-l-2 border-[#C5A059] pl-5 ml-2">
              {order.statusHistory.map((hist, i) => (
                <div key={i} className="relative space-y-0.5">
                  <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#C5A059] border-2 border-white" />
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0D0D0D]">
                    <span>{hist.status}</span>
                    <span className="text-neutral-400 font-normal">
                      • {formatDateTime(hist.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600">{hist.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
