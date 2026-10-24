import React from 'react';
import { Gift, Check, Crown } from 'lucide-react';
import type { CartGift, Category, GiftOptionsSettings, Product } from '../types';
import { formatPrice } from '../lib/api';

/** Whether the store offers gift wrap for this product (mirrors the server's eligibility rule). */
export function giftEligible(cfg: GiftOptionsSettings | undefined, product: Pick<Product, 'category'> | { category?: string }): boolean {
  if (!cfg?.enabled || !cfg.packages?.some((p) => p.isActive)) return false;
  const eligible = cfg.eligibleCategories || [];
  if (eligible.length === 0) return true;
  const cat = product.category as Category | string | undefined;
  const id = typeof cat === 'object' && cat ? cat._id : cat;
  return Boolean(id && eligible.includes(id));
}

interface Props {
  cfg: GiftOptionsSettings;
  value: CartGift | null;
  onChange: (gift: CartGift | null) => void;
  quantity: number;
  symbol: string;
  /** Hides the on/off switch (used when editing a gift that is already on). */
  alwaysOn?: boolean;
}

/** Optional gift wrap: packaging choice, recipient, message with live card preview and the extra charge. */
export const GiftOptionsPicker: React.FC<Props> = ({ cfg, value, onChange, quantity, symbol, alwaysOn }) => {
  const packages = cfg.packages.filter((p) => p.isActive);
  const on = alwaysOn || Boolean(value);
  const selected = packages.find((p) => p.key === value?.packageKey) || packages[0];
  const max = cfg.messageMaxLength || 150;
  const message = value?.message || '';
  const charge = (selected?.price || 0) * quantity;

  const update = (patch: Partial<CartGift>) =>
    onChange({ packageKey: selected.key, recipientName: value?.recipientName || '', message, ...patch });

  return (
    <div className={`rounded-2xl border transition-colors ${on ? 'border-[#C5A059]/60 bg-[#FFFDF8]' : 'border-neutral-200 bg-white'}`}>
      {!alwaysOn && (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(on ? null : { packageKey: packages[0].key, recipientName: '', message: '' })}
          className="w-full flex items-center justify-between gap-3 p-4 text-left"
        >
          <span className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#C5A059]/15 text-[#9E7B36] flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#0D0D0D]">Make it a gift</span>
              <span className="block text-xs text-neutral-500">
                Gift packaging and a personal message
                {packages.some((p) => p.price === 0) ? ' · from free' : ''}
              </span>
            </span>
          </span>
          <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-[#C5A059]' : 'bg-neutral-300'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
          </span>
        </button>
      )}

      {on && selected && (
        <div className={`space-y-4 ${alwaysOn ? 'p-4' : 'px-4 pb-4'}`}>
          <fieldset>
            <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Packaging</legend>
            <div className="grid grid-cols-1 gap-2">
              {packages.map((p) => {
                const active = p.key === selected.key;
                return (
                  <label
                    key={p.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      active ? 'border-[#C5A059] bg-[#C5A059]/10' : 'border-neutral-200 bg-white hover:border-[#C5A059]/50'
                    }`}
                  >
                    <input type="radio" name="gift-package" className="sr-only" checked={active} onChange={() => update({ packageKey: p.key })} />
                    <span className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${active ? 'bg-[#9E7B36] border-[#9E7B36]' : 'border-neutral-300'}`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0D0D0D]">
                        {p.name}
                        {p.isPremium && <Crown className="w-3.5 h-3.5 text-[#9E7B36]" aria-label="Premium" />}
                      </span>
                      {p.description && <span className="block text-xs text-neutral-500 leading-snug mt-0.5">{p.description}</span>}
                    </span>
                    <span className="text-sm font-semibold font-mono-code text-[#0D0D0D] shrink-0">
                      {p.price === 0 ? 'Free' : `+${formatPrice(p.price, symbol)}`}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="gift-recipient" className="block mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Recipient name <span className="normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              id="gift-recipient"
              value={value?.recipientName || ''}
              maxLength={60}
              onChange={(e) => update({ recipientName: e.target.value })}
              placeholder="e.g. Ayesha"
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/15"
            />
          </div>

          <div>
            <label htmlFor="gift-message" className="flex items-center justify-between mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <span>
                Gift message <span className="normal-case tracking-normal font-normal">(optional)</span>
              </span>
              <span className={`font-mono-code normal-case tracking-normal ${message.length > max * 0.9 ? 'text-amber-700' : ''}`}>
                {message.length}/{max}
              </span>
            </label>
            <textarea
              id="gift-message"
              rows={3}
              value={message}
              maxLength={max}
              onChange={(e) => update({ message: e.target.value })}
              placeholder="Happy anniversary — every day with you shines brighter."
              className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/15"
            />
          </div>

          {(message || value?.recipientName) && (
            <div className="relative rounded-xl bg-[#FAF8F5] border border-[#C5A059]/30 p-4 text-center" aria-label="Message card preview">
              <span className="absolute top-2 left-3 text-[9px] uppercase tracking-[0.3em] text-[#9E7B36]">Card preview</span>
              {value?.recipientName && <p className="mt-3 font-serif-luxury text-lg text-[#0D0D0D]">Dear {value.recipientName},</p>}
              {message && <p className="mt-2 font-serif-luxury italic text-base text-neutral-700 whitespace-pre-line break-words">{message}</p>}
              <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-[#9E7B36]">MS Velora</p>
            </div>
          )}

          <p className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              Gift wrap{quantity > 1 ? ` × ${quantity}` : ''}
            </span>
            <span className="font-mono-code font-semibold text-[#0D0D0D]">{charge === 0 ? 'Free' : `+${formatPrice(charge, symbol)}`}</span>
          </p>
        </div>
      )}
    </div>
  );
};
