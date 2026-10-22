import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Package, Truck, CheckCircle2, Clock, AlertTriangle, CreditCard, Banknote, Building2, Copy, MessageCircle } from 'lucide-react';
import { Order } from '../types';
import { formatPrice, formatDateTime } from '../lib/api';
import { useStore } from '../context/StoreContext';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order }) => {
  const { settings } = useStore();
  const symbol = settings?.currencySymbol || 'Rs.';

  if (!isOpen || !order) return null;

  const handleCopyPaymentDetails = () => {
    if (order.paymentMethod === 'online' && settings?.mobileWallets) {
      const jazzcash = settings.mobileWallets.jazzcash;
      const easypaisa = settings.mobileWallets.easypaisa;
      const details = `
JazzCash: ${jazzcash?.accountNumber || 'N/A'}
EasyPaisa: ${easypaisa?.accountNumber || 'N/A'}
Amount: ${formatPrice(order.totalAmount, symbol)}
Order #: ${order.orderNumber}
      `.trim();
      navigator.clipboard.writeText(details);
    } else if (order.paymentMethod === 'bank_transfer' && settings?.bankDetails) {
      navigator.clipboard.writeText(settings.bankDetails);
    }
  };

  const handleWhatsAppPayment = () => {
    if (settings?.whatsappNumber) {
      const message = `Hi, I have placed order #${order.orderNumber} and want to confirm payment. Order amount: ${formatPrice(order.totalAmount, symbol)}`;
      const link = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(link, '_blank');
    }
  };

  const paymentMethodInfo = {
    cod: {
      icon: Banknote,
      label: 'Cash on Delivery',
      description: 'Pay when you receive your package',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    bank_transfer: {
      icon: Building2,
      label: 'Bank Transfer',
      description: 'Transfer to our bank account',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    online: {
      icon: CreditCard,
      label: 'Online Payment',
      description: 'JazzCash / EasyPaisa',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  };

  const paymentInfo = paymentMethodInfo[order.paymentMethod as keyof typeof paymentMethodInfo] || paymentMethodInfo.cod;
  const PaymentIcon = paymentInfo.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22 }}
          className="relative z-10 w-full max-w-3xl bg-white rounded-xl overflow-hidden shadow-2xl border border-[#C5A059]/30 max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`Order ${order.orderNumber} Details`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-[#C5A059]/20 p-4 sm:p-6 flex items-center justify-between z-20">
            <div>
              <span className="text-[10px] uppercase tracking-[0.24em] text-[#9E7B36] font-semibold block">
                Order Confirmation
              </span>
              <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#0D0D0D]">
                Order #{order.orderNumber}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/90 text-[#0D0D0D] border border-black/10 hover:bg-[#C5A059] hover:text-white flex items-center justify-center transition-colors shadow-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Order Status */}
            <div className={`p-4 rounded-lg border ${paymentInfo.bgColor} ${paymentInfo.bgColor.replace('50', '100')} border-opacity-30`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${paymentInfo.bgColor}`}>
                  <CheckCircle2 className={`w-5 h-5 ${paymentInfo.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-[#0D0D0D]">Order Placed Successfully!</p>
                  <p className="text-sm text-neutral-600">We'll confirm your order shortly.</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-[#FAF8F5] p-4 rounded-lg border border-black/8">
              <div className="flex items-center gap-3 mb-3">
                <PaymentIcon className={`w-5 h-5 ${paymentInfo.color}`} />
                <div>
                  <p className="font-semibold text-[#0D0D0D]">{paymentInfo.label}</p>
                  <p className="text-xs text-neutral-600">{paymentInfo.description}</p>
                </div>
              </div>

              {order.paymentMethod === 'online' && settings?.mobileWallets && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white rounded border border-black/5">
                    <div>
                      <p className="text-xs font-semibold text-[#C8102E]">JazzCash</p>
                      <p className="text-sm font-mono-code">{settings.mobileWallets.jazzcash?.accountNumber || 'Contact us'}</p>
                    </div>
                    <span className="text-xs text-neutral-500">{settings.mobileWallets.jazzcash?.accountName || ''}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded border border-black/5">
                    <div>
                      <p className="text-xs font-semibold text-[#1BA548]">EasyPaisa</p>
                      <p className="text-sm font-mono-code">{settings.mobileWallets.easypaisa?.accountNumber || 'Contact us'}</p>
                    </div>
                    <span className="text-xs text-neutral-500">{settings.mobileWallets.easypaisa?.accountName || ''}</span>
                  </div>
                  {settings.mobileWallets.nayapay && (
                    <div className="flex items-center justify-between p-3 bg-white rounded border border-black/5">
                      <div>
                        <p className="text-xs font-semibold text-[#0066CC]">NayaPay</p>
                        <p className="text-sm font-mono-code">{settings.mobileWallets.nayapay.accountNumber || 'Contact us'}</p>
                      </div>
                      <span className="text-xs text-neutral-500">{settings.mobileWallets.nayapay.accountName || ''}</span>
                    </div>
                  )}
                  {settings.mobileWallets.sadapay && (
                    <div className="flex items-center justify-between p-3 bg-white rounded border border-black/5">
                      <div>
                        <p className="text-xs font-semibold text-[#FF6600]">SadaPay</p>
                        <p className="text-sm font-mono-code">{settings.mobileWallets.sadapay.accountNumber || 'Contact us'}</p>
                      </div>
                      <span className="text-xs text-neutral-500">{settings.mobileWallets.sadapay.accountName || ''}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-white rounded border border-black/5">
                    <p className="text-xs font-semibold text-[#0D0D0D]">Amount to Pay</p>
                    <p className="text-lg font-bold font-mono-code">{formatPrice(order.totalAmount, symbol)}</p>
                  </div>
                </div>
              )}

              {order.paymentMethod === 'bank_transfer' && settings?.bankDetails && (
                <div className="mt-4 p-3 bg-white rounded border border-black/5">
                  <pre className="text-xs whitespace-pre-wrap text-neutral-700">{settings.bankDetails}</pre>
                </div>
              )}

              {(order.paymentMethod === 'online' || order.paymentMethod === 'bank_transfer') && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPaymentDetails}
                    className="flex-1 py-2 px-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Details
                  </button>
                  {settings?.whatsappNumber && (
                    <button
                      type="button"
                      onClick={handleWhatsAppPayment}
                      className="flex-1 py-2 px-3 bg-[#25D366] hover:bg-[#1EBE5A] text-white text-xs uppercase tracking-wider font-semibold rounded flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div>
              <h3 className="font-serif-luxury text-lg font-semibold text-[#0D0D0D] mb-3">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-black/8">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded object-cover bg-[#F3EFE6]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#0D0D0D] truncate">{item.name}</p>
                      <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-mono-code text-sm font-bold">{formatPrice(item.price * item.quantity, symbol)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-[#FAF8F5] p-4 rounded-lg border border-black/8 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-mono-code">{formatPrice(order.subtotal, symbol)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono-code">-{formatPrice(order.discountAmount, symbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Shipping</span>
                <span className="font-mono-code">
                  {order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost, symbol)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#0D0D0D] pt-2 border-t border-black/10">
                <span>Total</span>
                <span className="font-mono-code">{formatPrice(order.totalAmount, symbol)}</span>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h3 className="font-serif-luxury text-lg font-semibold text-[#0D0D0D] mb-3">Shipping Address</h3>
              <div className="p-4 bg-white rounded-lg border border-black/8 space-y-1">
                <p className="font-semibold text-sm">{order.shippingAddress.fullName}</p>
                <p className="text-sm text-neutral-600">{order.shippingAddress.streetAddress}</p>
                <p className="text-sm text-neutral-600">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </p>
                <p className="text-sm text-neutral-600">{order.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Order Timeline */}
            <div>
              <h3 className="font-serif-luxury text-lg font-semibold text-[#0D0D0D] mb-3">Order Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Order Placed</p>
                    <p className="text-xs text-neutral-500">{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Processing</p>
                    <p className="text-xs text-neutral-500">We're preparing your order</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-neutral-100 text-neutral-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-neutral-400">Shipped</p>
                    <p className="text-xs text-neutral-400">Not yet shipped</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
