import React from 'react';
import { Gift } from 'lucide-react';
import type { ResolvedGift } from '../types';
import { formatPrice } from '../lib/api';

/** Gift wrap saved with an order item: packaging, charge, recipient and message. */
export const OrderGiftNote: React.FC<{ gift?: ResolvedGift; symbol?: string; className?: string }> = ({ gift, symbol = 'Rs.', className = '' }) => {
  if (!gift) return null;
  return (
    <div className={`mt-1.5 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/25 px-2.5 py-1.5 ${className}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7A5E27]">
        <Gift className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{gift.packageName}</span>
        <span className="ml-auto font-mono-code shrink-0">{gift.charge === 0 ? 'Free' : `+${formatPrice(gift.charge, symbol)}`}</span>
      </p>
      {gift.recipientName && <p className="text-[11px] text-neutral-700 mt-0.5">For: <strong>{gift.recipientName}</strong></p>}
      {gift.message && <p className="text-[11px] text-neutral-600 italic whitespace-pre-line break-words mt-0.5">“{gift.message}”</p>}
    </div>
  );
};
