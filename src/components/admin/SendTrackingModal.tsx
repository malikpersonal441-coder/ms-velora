import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle,
  X,
  Truck,
  ExternalLink,
  Copy,
  Check,
  Send,
  Save,
  Clock,
  Sparkles,
  History,
  Phone,
  MapPin,
  Package,
} from 'lucide-react';
import { apiRequest, formatDateTime, formatPrice } from '../../lib/api';
import {
  POPULAR_PAKISTANI_COURIERS,
  PAYMENT_LABEL,
  buildTrackingWhatsAppMessage,
  getCourierTrackingUrl,
  toWhatsAppNumber,
  waLink,
} from '../../lib/whatsapp';
import type { Order, StoreSettings } from '../../types';

interface SendTrackingModalProps {
  order: Order;
  settings?: StoreSettings | null;
  onClose: () => void;
  onSent: (updatedOrder: Order) => void;
  onError: (errorMessage: string) => void;
}

type TemplateLang = 'urdu' | 'english' | 'short';

const EST_DELIVERY_PRESETS = [
  '2-3 Working Days',
  '1-2 Days (Express)',
  '3-5 Days',
  'Same Day Delivery',
];

export const SendTrackingModal: React.FC<SendTrackingModalProps> = ({
  order,
  settings,
  onClose,
  onSent,
  onError,
}) => {
  // Pre-fill courier: order's existing courier or default to Leopards
  const [courier, setCourier] = useState<string>(order.courierName || 'Leopards');
  const [trackingNumber, setTrackingNumber] = useState<string>(order.trackingNumber || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('2-3 Working Days');
  const [phone, setPhone] = useState<string>(order.shippingAddress.phone || '');
  const [autoMarkShipped, setAutoMarkShipped] = useState<boolean>(
    order.fulfillmentStatus !== 'shipped' && order.fulfillmentStatus !== 'delivered'
  );
  const [saveToDb, setSaveToDb] = useState<boolean>(true);
  const [templateLang, setTemplateLang] = useState<TemplateLang>('urdu');
  const [copied, setCopied] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Live computed tracking URL
  const trackingUrl = useMemo(() => {
    return getCourierTrackingUrl(courier, trackingNumber, order.orderNumber);
  }, [courier, trackingNumber, order.orderNumber]);

  // Computed WhatsApp message based on fields and template
  const generatedMessage = useMemo(() => {
    return buildTrackingWhatsAppMessage({
      order,
      courier,
      trackingNumber,
      trackingUrl,
      estimatedDelivery,
      storeName: settings?.storeName || 'MS Velora',
      currencySymbol: settings?.currencySymbol || 'Rs.',
      language: templateLang,
    });
  }, [order, courier, trackingNumber, trackingUrl, estimatedDelivery, settings, templateLang]);

  // User-editable message state (allows manual touch-ups)
  const [message, setMessage] = useState<string>(generatedMessage);
  const [isEdited, setIsEdited] = useState<boolean>(false);

  // Sync message when generated template changes (unless user made manual edits)
  useEffect(() => {
    if (!isEdited) {
      setMessage(generatedMessage);
    }
  }, [generatedMessage, isEdited]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onError('Failed to copy to clipboard.');
    }
  };

  /**
   * Saves tracking number, courier, and optionally updates fulfillment status to 'shipped'
   */
  const persistTracking = async (alsoUpdateStatus: boolean): Promise<Order | null> => {
    const cleanCourier = courier.trim() || 'Leopards';
    const cleanTracking = trackingNumber.trim();

    try {
      // 1. Update status and tracking info
      const statusRes = await apiRequest(`/api/admin/orders/${order._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          courierName: cleanCourier,
          trackingNumber: cleanTracking,
          ...(alsoUpdateStatus ? { fulfillmentStatus: 'shipped' } : {}),
          note: `Tracking assigned: ${cleanCourier} (CN: ${cleanTracking || 'Pending'})${alsoUpdateStatus ? ' • Order marked as Shipped' : ''}`,
        }),
      });

      if (!statusRes.success) {
        throw new Error(statusRes.message || 'Failed to update order tracking.');
      }

      return statusRes.order;
    } catch (err: any) {
      onError(err.message || 'Failed to update tracking in database.');
      return null;
    }
  };

  /**
   * Save only without opening WhatsApp
   */
  const handleSaveOnly = async () => {
    setSaving(true);
    try {
      const updatedOrder = await persistTracking(autoMarkShipped);
      if (updatedOrder) {
        onSent(updatedOrder);
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * Main Action: Open WhatsApp synchronously, persist to DB, and log to WhatsApp history
   */
  const handleSendWhatsApp = async () => {
    if (!phone.trim()) {
      onError('Customer phone number is required.');
      return;
    }

    // Open WhatsApp synchronously inside the click handler to guarantee browser doesn't block pop-up
    const waUrl = waLink(phone, message);
    const win = window.open(waUrl, '_blank');

    setSaving(true);
    try {
      // 1. Persist tracking & optional shipped status in DB
      let updatedOrder: Order | null = null;
      if (saveToDb) {
        updatedOrder = await persistTracking(autoMarkShipped);
      }

      // 2. Log message to order's whatsappLog
      try {
        const logRes = await apiRequest(`/api/admin/orders/${order._id}/whatsapp-log`, {
          method: 'POST',
          body: JSON.stringify({
            template: isEdited ? 'custom' : 'shipped',
            message,
            phone,
          }),
        });
        if (logRes.success && logRes.order) {
          updatedOrder = logRes.order;
        }
      } catch (err: any) {
        // Logging error is non-fatal if WhatsApp already opened
        console.warn('WhatsApp message logging note:', err);
      }

      if (updatedOrder) {
        onSent(updatedOrder);
      } else {
        onClose();
      }
    } catch (err: any) {
      onError(err.message || 'Error saving tracking.');
    } finally {
      setSaving(false);
      if (!win) {
        onError('Your browser blocked the WhatsApp tab. Please allow pop-ups for this site.');
      }
    }
  };

  const formattedWaNum = toWhatsAppNumber(phone);
  const pastTrackingLogs = (order.whatsappLog || []).filter(
    (l) => l.template === 'shipped' || l.message.toLowerCase().includes('tracking')
  );

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Send tracking for order ${order.orderNumber}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#075E54] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#25D366] text-[#0D0D0D] flex items-center justify-center shrink-0 shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-wide text-white">
                  Send Tracking via WhatsApp
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono-code font-bold bg-white/20 text-[#DFBD78]">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{order.shippingAddress.fullName}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#DFBD78]" />
                  {order.shippingAddress.city}
                </span>
                <span>•</span>
                <span className="font-semibold text-[#DFBD78]">
                  {formatPrice(order.totalAmount)} ({PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod})
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200">
          {/* Left Column: Shipment & Courier Configuration (5 cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 space-y-5 bg-neutral-50/70">
            {/* Order Items Snippet */}
            <div className="p-3 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-neutral-500 font-semibold text-[11px]">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#9E7B36]" />
                  Order Summary
                </span>
                <span>
                  {order.items.length} piece{order.items.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pt-1 border-t border-neutral-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-neutral-700">
                    <span className="truncate max-w-[200px]" title={item.name}>
                      • {item.name} × {item.quantity}
                    </span>
                    <span className="font-mono-code text-neutral-500">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Courier Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                1. Select Courier Partner
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {POPULAR_PAKISTANI_COURIERS.map((c) => {
                  const isSelected = courier.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCourier(c)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                        isSelected
                          ? 'bg-[#075E54] text-white border-[#075E54] shadow-xs ring-1 ring-[#075E54]'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#075E54]/40 hover:bg-neutral-50'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* Custom / Exact Courier Input */}
              <div className="pt-1">
                <input
                  type="text"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="Or enter courier name (e.g. Trax, Leopards, TCS)"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#075E54]/30"
                />
              </div>
            </div>

            {/* Tracking / Consignment Number (CN) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  2. Tracking Number / Consignment No.
                </label>
                {trackingNumber && (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    CN Ready
                  </span>
                )}
              </div>
              <input
                type="text"
                dir="ltr"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder="e.g. LEO-98432104 or 127893412"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-mono-code font-bold tracking-wider text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-[#075E54]"
              />
              <p className="text-[11px] text-neutral-500">
                Customer parcel slip se consignment / tracking number yahan enter karein.
              </p>
            </div>

            {/* Live Tracking Link Preview */}
            <div className="p-3 rounded-xl bg-white border border-neutral-200 text-xs space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                <span>Courier Tracking Web Link</span>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#075E54] hover:underline font-semibold"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </span>
              <p className="text-[11px] font-mono-code text-neutral-600 truncate bg-neutral-50 p-2 rounded border border-neutral-100">
                {trackingUrl || '(Enter tracking number to preview live tracking link)'}
              </p>
            </div>

            {/* Estimated Delivery Presets */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                3. Estimated Delivery Time
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EST_DELIVERY_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEstimatedDelivery(p)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors border ${
                      estimatedDelivery === p
                        ? 'bg-[#C5A059] text-white border-[#C5A059] font-bold'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                placeholder="Custom delivery time (e.g. 2-3 Working Days)"
                className="w-full mt-1 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium"
              />
            </div>

            {/* Automation Options (Mark as Shipped + Save to DB) */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoMarkShipped}
                  onChange={(e) => setAutoMarkShipped(e.target.checked)}
                  className="mt-0.5 rounded text-[#075E54] focus:ring-[#075E54]"
                />
                <div>
                  <span className="font-bold text-[#0D0D0D]">Mark Order as &quot;Shipped&quot;</span>
                  <p className="text-neutral-500 text-[11px]">
                    Order fulfillment status will automatically change to Shipped in database.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToDb}
                  onChange={(e) => setSaveToDb(e.target.checked)}
                  className="mt-0.5 rounded text-[#075E54] focus:ring-[#075E54]"
                />
                <div>
                  <span className="font-bold text-[#0D0D0D]">Save Courier &amp; Tracking in Database</span>
                  <p className="text-neutral-500 text-[11px]">
                    Stores CN and courier on order record so it shows on printable slips and invoice.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column: WhatsApp Live Message Composer & Actions (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 space-y-4 bg-[#ECE5DD] flex flex-col justify-between">
            <div className="space-y-4">
              {/* Recipient Phone & Template Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#075E54]" />
                    <span>Customer WhatsApp Phone</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03xx xxxxxxx"
                      className="px-3 py-1.5 rounded-lg border border-neutral-300 font-mono-code font-bold text-xs text-[#0D0D0D] w-full max-w-[200px]"
                    />
                    <span className="text-[11px] font-mono-code text-neutral-500">
                      wa.me/{formattedWaNum}
                    </span>
                  </div>
                </div>

                {/* Template Language Switcher */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Language / Tone
                  </label>
                  <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateLang('urdu');
                        setIsEdited(false);
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        templateLang === 'urdu'
                          ? 'bg-white text-[#075E54] shadow-xs'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      🇵🇰 Urdu / Roman
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateLang('english');
                        setIsEdited(false);
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        templateLang === 'english'
                          ? 'bg-white text-[#075E54] shadow-xs'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      🇬🇧 Luxury English
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateLang('short');
                        setIsEdited(false);
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        templateLang === 'short'
                          ? 'bg-white text-[#075E54] shadow-xs'
                          : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      ⚡ Short
                    </button>
                  </div>
                </div>
              </div>

              {/* Live WhatsApp Bubble Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-700">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#9E7B36]" />
                    WhatsApp Message Preview
                    {isEdited && (
                      <span className="text-amber-800 text-[10px] font-normal bg-amber-100 px-1.5 py-0.5 rounded">
                        Custom Edited
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {isEdited && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEdited(false);
                          setMessage(generatedMessage);
                        }}
                        className="text-[11px] text-[#075E54] hover:underline font-semibold"
                      >
                        Reset to Template
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-semibold transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  {/* WhatsApp Speech Bubble Container */}
                  <textarea
                    dir="auto"
                    rows={12}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setIsEdited(true);
                    }}
                    placeholder="Enter or customize WhatsApp message..."
                    className="w-full p-4 rounded-xl rounded-tr-none border border-[#25D366]/40 bg-[#DCF8C6] text-neutral-900 text-xs sm:text-[13px] leading-relaxed shadow-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none"
                  />
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1 px-1">
                    <span>Aap is message ko send karne se pehle apni marzi ke mutabiq edit kar saktay hain.</span>
                    <span>{message.length} chars</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  disabled={saving}
                  className="py-3 px-4 rounded-xl border border-neutral-400/80 bg-white hover:bg-neutral-50 text-[#0D0D0D] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  title="Save tracking to database without opening WhatsApp"
                >
                  <Save className="w-4 h-4 text-neutral-600" />
                  <span>{saving ? 'Saving...' : 'Save Tracking Only'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={saving || !phone.trim() || !message.trim()}
                  className="py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5A] text-[#0D0D0D] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  title="Send message to customer on WhatsApp"
                >
                  <Send className="w-4 h-4" />
                  <span>{saving ? 'Processing...' : 'Open WhatsApp & Send'}</span>
                </button>
              </div>

              <p className="text-[11px] text-neutral-600 text-center">
                Click karte hi WhatsApp web / app open ho jayega aur message ready hoga. Send dabate hi delivery ho jayegi!
              </p>
            </div>
          </div>
        </div>

        {/* Footer: Previous WhatsApp Send History */}
        {pastTrackingLogs.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 text-xs flex items-center gap-2 overflow-x-auto">
            <History className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="font-bold text-neutral-700 whitespace-nowrap">Previous tracking messages:</span>
            {pastTrackingLogs.map((log, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 text-[11px] whitespace-nowrap"
                title={log.message}
              >
                {formatDateTime(log.sentAt)} ({log.sentBy})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
