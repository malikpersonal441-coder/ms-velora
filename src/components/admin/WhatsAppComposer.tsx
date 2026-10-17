import React, { useMemo, useState } from 'react';
import { MessageCircle, X, Send, CheckCircle2 } from 'lucide-react';
import { apiRequest, formatDateTime } from '../../lib/api';
import {
  TEMPLATE_META,
  getTemplates,
  renderTemplate,
  suggestedTemplate,
  waLink,
} from '../../lib/whatsapp';
import type { Order, StoreSettings, WhatsAppTemplateKey } from '../../types';

interface ComposerProps {
  order: Order;
  settings: StoreSettings | null;
  initialTemplate?: WhatsAppTemplateKey;
  onClose: () => void;
  onSent: (order: Order) => void;
  onError: (message: string) => void;
}

/**
 * Preview + edit a templated message, then open WhatsApp (click-to-chat) and
 * record the send against the order so the team sees who messaged whom.
 */
export const WhatsAppComposer: React.FC<ComposerProps> = ({
  order,
  settings,
  initialTemplate,
  onClose,
  onSent,
  onError,
}) => {
  const templates = useMemo(() => getTemplates(settings), [settings]);
  const [templateKey, setTemplateKey] = useState<WhatsAppTemplateKey>(
    initialTemplate || suggestedTemplate(order)
  );
  const [message, setMessage] = useState(() => renderTemplate(templates[templateKey], order, settings));
  const [edited, setEdited] = useState(false);
  const [phone, setPhone] = useState(order.shippingAddress.phone);
  const [sending, setSending] = useState(false);

  const sentKeys = new Set((order.whatsappLog || []).map((l) => l.template));

  const chooseTemplate = (key: WhatsAppTemplateKey) => {
    setTemplateKey(key);
    setMessage(renderTemplate(templates[key], order, settings));
    setEdited(false);
  };

  const handleSend = async () => {
    // Open synchronously inside the click so the popup isn't blocked
    const win = window.open(waLink(phone, message), '_blank');
    setSending(true);
    try {
      const res = await apiRequest(`/api/admin/orders/${order._id}/whatsapp-log`, {
        method: 'POST',
        body: JSON.stringify({ template: edited ? 'custom' : templateKey, message, phone }),
      });
      if (res.success) onSent(res.order);
    } catch (err: any) {
      onError(`WhatsApp opened, but the message wasn't logged: ${err.message || 'unknown error'}`);
    } finally {
      setSending(false);
      if (!win) onError('Your browser blocked the WhatsApp tab — allow pop-ups for this site.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`WhatsApp message for order ${order.orderNumber}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 bg-[#075E54] text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#0D0D0D]" />
            </span>
            <div>
              <p className="font-semibold">{order.shippingAddress.fullName}</p>
              <p className="text-xs text-white/70 font-mono-code">
                {order.orderNumber} • {order.fulfillmentStatus}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Template picker */}
          <div className="md:col-span-2 p-4 border-b md:border-b-0 md:border-r border-neutral-200 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 mb-2">Templates</p>
            {(Object.keys(TEMPLATE_META) as WhatsAppTemplateKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => chooseTemplate(key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  templateKey === key && !edited
                    ? 'bg-[#25D366]/15 border border-[#25D366]/50'
                    : 'hover:bg-neutral-100 border border-transparent'
                }`}
              >
                <span className="flex items-center justify-between gap-2 font-semibold text-[#0D0D0D]">
                  {TEMPLATE_META[key].label}
                  {sentKeys.has(key) && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> sent
                    </span>
                  )}
                </span>
                <span className="block text-neutral-500 mt-0.5">{TEMPLATE_META[key].hint}</span>
              </button>
            ))}
          </div>

          {/* Preview / edit */}
          <div className="md:col-span-3 p-5 space-y-4 bg-[#ECE5DD]">
            <label className="block text-xs">
              <span className="font-semibold text-neutral-700">Customer WhatsApp number</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white font-mono-code"
              />
            </label>

            <label className="block text-xs">
              <span className="font-semibold text-neutral-700">
                Message {edited && <span className="text-amber-700 font-normal">(edited — logged as custom)</span>}
              </span>
              <textarea dir="auto"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setEdited(true);
                }}
                rows={10}
                className="mt-1 w-full p-3 rounded-lg rounded-tr-none border border-[#25D366]/30 bg-[#DCF8C6] text-sm text-[#0D0D0D] leading-relaxed shadow-sm"
              />
            </label>

            {order.fulfillmentStatus === 'shipped' && !order.trackingNumber && templateKey === 'shipped' && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                No tracking number on this order yet — add it in the order panel first.
              </p>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !message.trim() || !phone.trim()}
              className="w-full py-3.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5A] text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Logging…' : 'Open WhatsApp & Send'}
            </button>
            <p className="text-[11px] text-neutral-600 text-center">
              WhatsApp opens with this message ready — press send in WhatsApp to deliver it.
            </p>
          </div>
        </div>

        {(order.whatsappLog?.length || 0) > 0 && (
          <div className="p-5 border-t border-neutral-200">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 mb-3">
              Message history
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {[...(order.whatsappLog || [])].reverse().map((l, i) => (
                <li key={i} className="text-xs p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="flex justify-between gap-2 text-neutral-500 mb-1">
                    <span className="font-semibold text-[#0D0D0D]">
                      {l.template === 'custom' ? 'Custom message' : TEMPLATE_META[l.template]?.label}
                    </span>
                    <span>
                      {l.sentBy} • {formatDateTime(l.sentAt)}
                    </span>
                  </div>
                  <p dir="auto" className="whitespace-pre-line text-neutral-700 line-clamp-3">{l.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
