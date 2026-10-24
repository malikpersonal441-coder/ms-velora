import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gift, Pencil, X, AlertTriangle } from 'lucide-react';
import type { CartGift, ValidatedCartItem } from '../types';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../lib/api';
import { GiftOptionsPicker } from './GiftOptionsPicker';

/**
 * Gift summary under a cart line, with an editor to add, change or remove gift wrap.
 * Prices shown come from the server's cart validation; `readOnly` hides the editing controls.
 */
export const CartLineGift: React.FC<{ item: ValidatedCartItem; readOnly?: boolean; compact?: boolean }> = ({ item, readOnly, compact }) => {
  const { settings, rawCart, setCartItemGift } = useStore();
  const symbol = settings?.currencySymbol || 'Rs.';
  const cfg = settings?.giftOptions;
  const raw = rawCart.find((r) => r.productId === item.productId && (r.variantSku || '') === (item.variantSku || ''));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CartGift | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEditing(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const canGift = Boolean(cfg?.enabled && cfg.packages.some((p) => p.isActive));
  if (!item.gift && !item.giftError && (readOnly || !canGift)) return null;

  const open = () => {
    setDraft(raw?.gift || { packageKey: cfg!.packages.find((p) => p.isActive)!.key, recipientName: '', message: '' });
    setEditing(true);
  };

  return (
    <>
      {item.giftError ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            {item.giftError} Not charged.
            {!readOnly && (
              <button type="button" onClick={() => setCartItemGift(item.productId, item.variantSku, null)} className="ml-1 underline font-semibold">
                Remove
              </button>
            )}
          </span>
        </p>
      ) : item.gift ? (
        <div className={`mt-1.5 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/25 ${compact ? 'px-2 py-1.5' : 'px-2.5 py-2'}`}>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7A5E27]">
            <Gift className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{item.gift.packageName}</span>
            <span className="ml-auto font-mono-code shrink-0">{item.gift.charge === 0 ? 'Free' : `+${formatPrice(item.gift.charge, symbol)}`}</span>
          </div>
          {(item.gift.recipientName || item.gift.message) && (
            <p className="mt-0.5 text-[11px] text-neutral-600 line-clamp-2 break-words">
              {item.gift.recipientName && <strong className="font-semibold">For {item.gift.recipientName}: </strong>}
              {item.gift.message && <span className="italic">“{item.gift.message}”</span>}
            </p>
          )}
          {!readOnly && (
            <div className="mt-1 flex gap-3 text-[11px] font-semibold">
              <button type="button" onClick={open} className="inline-flex items-center gap-1 text-[#9E7B36] hover:text-[#0D0D0D]">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button type="button" onClick={() => setCartItemGift(item.productId, item.variantSku, null)} className="text-neutral-500 hover:text-red-600">
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={open} className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9E7B36] hover:text-[#0D0D0D]">
          <Gift className="w-3.5 h-3.5" /> Add gift wrap
        </button>
      )}

      {editing &&
        cfg &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-6 bg-[#0D0D0D]/60 backdrop-blur-sm" onClick={() => setEditing(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Gift options for ${item.name}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md max-h-[92vh] flex flex-col bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-neutral-200/80">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#9E7B36] font-semibold">Gift options</p>
                  <p className="font-serif-luxury text-lg font-semibold truncate">{item.name}</p>
                </div>
                <button type="button" onClick={() => setEditing(false)} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <GiftOptionsPicker cfg={cfg} value={draft} onChange={(g) => g && setDraft(g)} quantity={item.quantity} symbol={symbol} alwaysOn />
              </div>
              <div className="flex gap-2 px-4 py-3 bg-white border-t border-neutral-200/80">
                {item.gift && (
                  <button
                    type="button"
                    onClick={() => {
                      setCartItemGift(item.productId, item.variantSku, null);
                      setEditing(false);
                    }}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
                  >
                    Remove gift
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (draft) setCartItemGift(item.productId, item.variantSku, draft);
                    setEditing(false);
                  }}
                  className="ml-auto px-6 py-3 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
