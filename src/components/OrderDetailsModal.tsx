import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Package, Truck, CheckCircle2, Home, ClipboardCheck, XCircle, CreditCard, Banknote, Building2, Copy, Check, MessageCircle, MapPin, Phone } from 'lucide-react';
import { Order } from '../types';
import { formatPrice, formatDateTime } from '../lib/api';
import { useStore } from '../context/StoreContext';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const STEPS = [
  { key: 'pending', label: 'Placed', icon: ClipboardCheck },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
] as const;

const PAYMENT = {
  cod: { icon: Banknote, label: 'Cash on Delivery', description: 'Pay in cash when your parcel arrives' },
  bank_transfer: { icon: Building2, label: 'Bank Transfer', description: 'Transfer to our bank account below' },
  online: { icon: CreditCard, label: 'JazzCash / EasyPaisa', description: 'Send the amount to one of the wallets below' },
  jazzcash: { icon: CreditCard, label: 'JazzCash', description: 'Send the amount to the wallet below' },
  easypaisa: { icon: CreditCard, label: 'EasyPaisa', description: 'Send the amount to the wallet below' },
  online_card: { icon: CreditCard, label: 'Card Payment', description: 'Paid online by card' },
} as const;

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order }) => {
  const { settings } = useStore();
  const symbol = settings?.currencySymbol || 'Rs.';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const isWallet = ['online', 'jazzcash', 'easypaisa'].includes(order.paymentMethod);
  const payment = PAYMENT[order.paymentMethod as keyof typeof PAYMENT] || PAYMENT.cod;
  const PaymentIcon = payment.icon;
  const isPaid = order.paymentStatus === 'paid';

  const wallets = [
    { name: 'JazzCash', color: '#C8102E', w: settings?.mobileWallets?.jazzcash },
    { name: 'EasyPaisa', color: '#1BA548', w: settings?.mobileWallets?.easypaisa },
    { name: 'NayaPay', color: '#0066CC', w: settings?.mobileWallets?.nayapay },
    { name: 'SadaPay', color: '#FF6600', w: settings?.mobileWallets?.sadapay },
  ].filter(({ name, w }) => {
    if (!w) return false;
    if (order.paymentMethod === 'jazzcash') return name === 'JazzCash';
    if (order.paymentMethod === 'easypaisa') return name === 'EasyPaisa';
    return true;
  });

  const status = order.fulfillmentStatus;
  const isClosed = status === 'cancelled' || status === 'refunded';
  const currentStep = Math.max(0, STEPS.findIndex((s) => s.key === status));

  const handleCopyPaymentDetails = () => {
    const details = isWallet
      ? [
          ...wallets.map(({ name, w }) => `${name}: ${w?.accountNumber || 'N/A'}`),
          `Amount: ${formatPrice(order.totalAmount, symbol)}`,
          `Order #: ${order.orderNumber}`,
        ].join('\n')
      : settings?.bankDetails || '';
    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppPayment = () => {
    if (!settings?.whatsappNumber) return;
    const message = `Hi, I have placed order #${order.orderNumber} and want to confirm payment. Order amount: ${formatPrice(order.totalAmount, symbol)}`;
    window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0D0D0D]/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full sm:max-w-2xl bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`Order ${order.orderNumber} Details`}
        >
          {/* Header */}
          <div className="relative bg-[#0D0D0D] text-[#FAF8F5] px-5 sm:px-8 pt-6 pb-7 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(197,160,89,0.35),transparent_60%)]" />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#DFBD78] font-semibold">
                {isClosed ? 'Order Closed' : 'Thank you for your order'}
              </span>
              <h2 className="mt-1 font-serif-luxury text-3xl sm:text-4xl font-semibold">#{order.orderNumber}</h2>
              <p className="mt-1 text-xs text-white/60">Placed {formatDateTime(order.createdAt)}</p>
            </div>

            {/* Progress */}
            {isClosed ? (
              <div className="relative mt-6 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-red-500/15 text-red-200 text-xs font-semibold">
                <XCircle className="w-4 h-4" />
                This order was {status}.
              </div>
            ) : (
              <ol className="relative mt-7 grid grid-cols-5">
                {STEPS.map((s, i) => {
                  const done = i <= currentStep;
                  const Icon = s.icon;
                  return (
                    <li key={s.key} className="relative flex flex-col items-center text-center">
                      {i > 0 && (
                        <span className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${i <= currentStep ? 'bg-[#C5A059]' : 'bg-white/15'}`} />
                      )}
                      <span
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          done ? 'bg-[#C5A059] text-[#0D0D0D]' : 'bg-[#1F1F22] text-white/40 ring-1 ring-white/15'
                        } ${i === currentStep ? 'ring-4 ring-[#C5A059]/30' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className={`mt-2 text-[10px] sm:text-[11px] font-semibold ${done ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-5">
            {/* Tracking */}
            {order.trackingNumber && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#C5A059]/30">
                <span className="w-10 h-10 rounded-xl bg-[#C5A059]/15 text-[#9E7B36] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 font-semibold">{order.courierName || 'Courier'} tracking</p>
                  <p className="font-mono-code text-sm font-bold text-[#0D0D0D] truncate">{order.trackingNumber}</p>
                </div>
              </div>
            )}

            {/* Items */}
            <section className="rounded-2xl bg-white border border-neutral-200/80 overflow-hidden">
              <h3 className="px-5 pt-4 pb-2 text-[11px] uppercase tracking-[0.16em] text-neutral-500 font-semibold">
                Your Pieces ({order.items.reduce((n, i) => n + i.quantity, 0)})
              </h3>
              <ul className="divide-y divide-neutral-100">
                {order.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-4 px-5 py-3">
                    <img src={item.image || '/brand/logo.jpg'} alt={item.name} className="w-16 h-16 rounded-xl object-cover bg-[#F3EFE6] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif-luxury text-base font-semibold text-[#0D0D0D] leading-snug line-clamp-2">{item.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {item.variantName ? `${item.variantName} · ` : ''}Qty {item.quantity} × {formatPrice(item.unitPrice, symbol)}
                      </p>
                    </div>
                    <p className="font-mono-code text-sm font-bold text-[#0D0D0D] shrink-0">
                      {formatPrice(item.subtotal ?? item.unitPrice * item.quantity, symbol)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-4 bg-[#FAF8F5] border-t border-neutral-100 space-y-1.5 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-mono-code">{formatPrice(order.subtotal, symbol)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                    <span className="font-mono-code">−{formatPrice(order.discountAmount, symbol)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping</span>
                  <span className="font-mono-code">{order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost, symbol)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-black/10">
                  <span className="font-semibold text-[#0D0D0D]">Total</span>
                  <span className="font-mono-code text-xl font-bold text-[#0D0D0D]">{formatPrice(order.totalAmount, symbol)}</span>
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-2xl bg-white border border-neutral-200/80 p-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#0D0D0D] text-[#C5A059] flex items-center justify-center shrink-0">
                  <PaymentIcon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0D0D0D]">{payment.label}</p>
                  <p className="text-xs text-neutral-500">{payment.description}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isPaid ? 'Paid' : 'Unpaid'}
                </span>
              </div>

              {!isPaid && isWallet && wallets.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {wallets.map(({ name, color, w }) => (
                    <div key={name} className="p-3 rounded-xl border border-neutral-200 bg-[#FAF8F5]">
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{name}</p>
                      <p className="font-mono-code text-sm font-semibold text-[#0D0D0D]">{w?.accountNumber || 'Contact us'}</p>
                      {(w as any)?.accountTitle && <p className="text-[11px] text-neutral-500">{(w as any).accountTitle}</p>}
                    </div>
                  ))}
                </div>
              )}

              {!isPaid && order.paymentMethod === 'bank_transfer' && settings?.bankDetails && (
                <pre className="mt-4 p-3 rounded-xl border border-neutral-200 bg-[#FAF8F5] text-xs whitespace-pre-wrap text-neutral-700 font-sans">
                  {settings.bankDetails}
                </pre>
              )}

              {!isPaid && (isWallet || order.paymentMethod === 'bank_transfer') && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPaymentDetails}
                    className="py-3 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy Details'}
                  </button>
                  {settings?.whatsappNumber && (
                    <button
                      type="button"
                      onClick={handleWhatsAppPayment}
                      className="py-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5A] text-white text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Send Receipt
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Delivery address */}
            <section className="rounded-2xl bg-white border border-neutral-200/80 p-5">
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-neutral-500 font-semibold mb-3">Delivering To</h3>
              <p className="font-semibold text-[#0D0D0D]">{order.shippingAddress.fullName}</p>
              <p className="mt-1.5 text-sm text-neutral-600 flex gap-2">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <span>
                  {order.shippingAddress.streetAddress}, {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </span>
              </p>
              <p className="mt-1 text-sm text-neutral-600 flex gap-2">
                <Phone className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <span className="font-mono-code">{order.shippingAddress.phone}</span>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
