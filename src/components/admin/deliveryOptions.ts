import type { Order } from '../../types';

export type ShippingMethod = Order['shippingMethod'];

export const DELIVERY_METHODS: { value: ShippingMethod; label: string; hint: string }[] = [
  { value: 'standard', label: 'Courier', hint: 'Leopards / TCS, standard rate' },
  { value: 'express', label: 'Express courier', hint: 'Faster courier, express rate' },
  { value: 'hand', label: 'Hand delivery', hint: 'Own rider or delivered by hand' },
  { value: 'pickup', label: 'Store pickup', hint: 'Customer collects, no charge' },
];

export const DELIVERY_LABEL: Record<string, string> = Object.fromEntries(
  DELIVERY_METHODS.map((m) => [m.value, m.label])
);

export const COURIERS = ['Leopards', 'TCS', 'M&P', 'PostEx', 'Trax', 'Call Courier'];

export interface DeliverySettings {
  standardShippingFee: number;
  expressShippingFee: number;
  freeShippingThreshold: number;
  handDeliveryFee?: number;
}

/** Same default the server uses when no custom charge is entered. */
export const defaultDeliveryCharge = (method: ShippingMethod, subtotal: number, s?: DeliverySettings | null) => {
  if (!s || method === 'pickup') return 0;
  if (method === 'hand') return s.handDeliveryFee || 0;
  if (method === 'express') return s.expressShippingFee;
  return subtotal >= s.freeShippingThreshold ? 0 : s.standardShippingFee;
};
