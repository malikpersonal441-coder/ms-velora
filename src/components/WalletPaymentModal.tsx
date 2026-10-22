import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, MessageCircle, CheckCircle2, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Order, StoreSettings } from '../types';
import { formatPrice } from '../lib/api';
import { waLink } from '../lib/whatsapp';

const WALLETS = [
  { key: 'jazzcash', name: 'JazzCash', badge: 'JC', bg: 'bg-[#C8102E]' },
  { key: 'easypaisa', name: 'EasyPaisa', badge: 'EP', bg: 'bg-[#1BA548]' },
  { key: 'nayapay', name: 'NayaPay', badge: 'NP', bg: 'bg-[#0066CC]' },
  { key: 'sadapay', name: 'SadaPay', badge: 'SP', bg: 'bg-[#FF6600]' },
] as const;

/** Online (JazzCash / EasyPaisa / NayaPay / SadaPay) orders: payment is sent manually + screenshot on WhatsApp. */
export const isWalletMethod = (m: string) => m === 'online' || m === 'jazzcash' || m === 'easypaisa' || m === 'nayapay' || m === 'sadapay';

const CopyButton: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard blocked — the value is still visible
        }
      }}
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 hover:border-[#0D0D0D] text-[11px] font-semibold transition-colors"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

/**
 * Shown right after an order is placed (and from the receipt for unpaid online orders).
 * Online payment lists every enabled wallet account; COD / bank just confirms the order.
 */
export const WalletPaymentModal: React.FC<{
  order: Order;
  settings: StoreSettings | null;
  onClose: () => void;
  /** true right after checkout: shows the "order placed" header */
  justPlaced?: boolean;
}> = ({ order, settings, onClose, justPlaced = false }) => {
  const symbol = settings?.currencySymbol || 'Rs.';
  const amount = formatPrice(order.totalAmount, symbol);
  const online = isWalletMethod(order.paymentMethod);
  const enabled = WALLETS.filter((w) => {
    if (order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa') return w.key === order.paymentMethod;
    return settings?.mobileWallets?.[w.key]?.enabled !== false && settings?.mobileWallets?.[w.key]?.accountNumber;
  });
  // Merge wallets that share the same number + title into one row ("JazzCash / EasyPaisa")
  const rows: { wallets: (typeof WALLETS)[number][]; number: string; title: string }[] = [];
  enabled.forEach((w) => {
    const acc = settings!.mobileWallets![w.key];
    const key = acc.accountNumber.replace(/\s/g, '');
    const existing = rows.find((r) => r.number.replace(/\s/g, '') === key && r.title === acc.accountTitle);
    if (existing) existing.wallets.push(w);
    else rows.push({ wallets: [w], number: acc.accountNumber, title: acc.accountTitle });
  });
  const storeNumber = settings?.whatsappNumber;

  const message = [
    'Hello! I have paid for my order.',
    '',
    `Order number: *${order.orderNumber}*`,
    `Amount: *${amount}*`,
    `Name: ${order.shippingAddress.fullName}`,
    '',
    'Sending the payment screenshot below 👇',
  ].join('\n');

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full sm:max-w-[420px] max-h-[92vh] sm:max-h-[86vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={online ? 'Complete your payment' : 'Order placed'}
      >
        {/* Header (fixed) */}
        <div className="relative shrink-0 px-5 pt-5 pb-4 bg-gradient-to-b from-[#FAF6EC] to-white border-b border-black/5">
          <button type="button" onClick={onClose} className="absolute right-3 top-3 p-2 rounded-full text-neutral-400 hover:text-[#0D0D0D] hover:bg-black/5" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${justPlaced ? 'bg-emerald-50' : 'bg-[#C5A059]/15'}`}>
              {justPlaced ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Smartphone className="w-5 h-5 text-[#9E7B36]" />}
            </span>
            <div className="min-w-0">
              <p className="font-serif-luxury text-xl font-semibold text-[#0D0D0D] leading-tight">
                {justPlaced ? 'Order placed — thank you!' : 'Complete your payment'}
              </p>
              <p className="text-xs text-neutral-500">
                Ref <span className="font-semibold text-[#0D0D0D]">{order.orderNumber}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between rounded-xl bg-white border border-[#C5A059]/30 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-semibold">{online ? 'Amount to send' : 'Order total'}</span>
            <span className="font-serif-luxury text-[28px] leading-none font-semibold text-[#0D0D0D] tabular-nums">{amount}</span>
          </div>
        </div>

        {/* Body (scrolls only if needed) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {online ? (
            <>
              {rows.length === 0 ? (
                <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">Account details are not set yet. Please contact us on WhatsApp.</p>
              ) : (
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div key={r.number + r.title} className="flex items-center gap-3 p-3.5 rounded-xl border border-black/[0.08] bg-[#FCFBF8]">
                      <div className="flex -space-x-1.5 shrink-0">
                        {r.wallets.map((w) => (
                          <span key={w.key} className={`w-8 h-8 rounded-lg text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white ${w.bg}`}>
                            {w.badge}
                          </span>
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-neutral-500 truncate">{r.wallets.map((w) => w.name).join(' / ')}</p>
                        <p className="text-[17px] font-semibold tabular-nums tracking-wide leading-tight">{r.number}</p>
                        <p className="text-[11px] text-neutral-500 truncate">{r.title}</p>
                      </div>
                      <CopyButton value={r.number.replace(/\s/g, '')} label="account number" />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {['Send the amount', 'Take a screenshot', 'Send on WhatsApp'].map((t, i) => (
                  <div key={t} className="rounded-xl bg-[#FAF8F5] px-2 py-3">
                    <span className="mx-auto w-6 h-6 rounded-full bg-[#0D0D0D] text-[#DFBD78] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="mt-1.5 text-[11px] font-medium text-neutral-700 leading-snug">{t}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-[11px] text-neutral-500 leading-relaxed">
                {settings?.mobileWallets?.instructions || 'Your order is confirmed as soon as we verify the payment.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-600 text-center leading-relaxed py-2">
              {order.paymentMethod === 'cod'
                ? 'Pay cash when your jewellery is delivered. We will contact you shortly to confirm your order.'
                : 'We will contact you shortly with the payment details to confirm your order.'}
            </p>
          )}
        </div>

        {/* Footer (always visible) */}
        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-black/5 bg-white space-y-2.5">
          {storeNumber && (
            <a
              href={waLink(storeNumber, online ? message : `Hello! I would like to talk about my order *${order.orderNumber}*.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5A] text-[#0D0D0D] text-xs uppercase tracking-[0.16em] font-bold shadow-[0_8px_20px_-10px_rgba(37,211,102,0.8)] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {online ? 'Send Screenshot on WhatsApp' : 'Chat with us on WhatsApp'}
            </a>
          )}
          <div className="flex items-center justify-between text-[12px] font-semibold">
            <Link to={`/order-confirmation/${order.orderNumber}`} onClick={onClose} className="px-2 py-1.5 text-neutral-500 hover:text-[#0D0D0D]">
              View receipt
            </Link>
            <button type="button" onClick={onClose} className="px-2 py-1.5 text-[#9E7B36] hover:text-[#0D0D0D]">
              Continue shopping →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
