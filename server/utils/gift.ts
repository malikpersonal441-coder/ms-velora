import { z } from 'zod';
import type { IStoreSettings } from '../models/StoreSettings';

/** What the shopper sends for one cart line. Prices are never accepted from the client. */
export const giftInputSchema = z.object({
  packageKey: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().max(60).optional().default(''),
  message: z.string().trim().max(500).optional().default(''),
});
export type GiftInput = z.infer<typeof giftInputSchema>;

/** Gift details stored with an order item. */
export interface ResolvedGift {
  packageKey: string;
  packageName: string;
  unitPrice: number;
  recipientName: string;
  message: string;
  charge: number;
}

/**
 * Checks a line's gift request against the store's gift settings and prices it.
 * Returns `{ error }` when the request cannot be honoured (disabled, unknown package,
 * category not eligible, message too long) so callers decide whether to drop or reject it.
 */
export function resolveGift(
  settings: IStoreSettings,
  categoryId: string | undefined,
  gift: GiftInput | undefined,
  quantity: number
): { gift?: ResolvedGift; error?: string } {
  if (!gift) return {};
  const cfg = settings.giftOptions;
  if (!cfg?.enabled) return { error: 'Gift wrapping is currently unavailable.' };
  const pkg = cfg.packages.find((p) => p.key === gift.packageKey.toLowerCase() && p.isActive);
  if (!pkg) return { error: 'That gift packaging is no longer available.' };
  const eligible = cfg.eligibleCategories?.map(String) || [];
  if (eligible.length > 0 && (!categoryId || !eligible.includes(categoryId))) {
    return { error: 'Gift wrapping is not available for this piece.' };
  }
  // Collapse runs of spaces and blank lines; keep single line breaks
  const message = gift.message.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (message.length > cfg.messageMaxLength) {
    return { error: `Gift messages can be up to ${cfg.messageMaxLength} characters.` };
  }
  return {
    gift: {
      packageKey: pkg.key,
      packageName: pkg.name,
      unitPrice: pkg.price,
      recipientName: gift.recipientName,
      message,
      charge: pkg.price * quantity,
    },
  };
}
