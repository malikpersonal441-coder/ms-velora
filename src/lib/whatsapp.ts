import type { Order, StoreSettings, WhatsAppTemplateKey, WhatsAppTemplates } from '../types';
import { formatPrice } from './api';

export const DEFAULT_TEMPLATES: WhatsAppTemplates = {
  processing:
    'Dear {name}, your order *{orderNumber}* is being prepared 📦\nWe are carefully checking and packing your jewellery. You will receive the tracking number once it ships.',
  paymentReceived:
    'Dear {name}, we have received your payment of *{total}* ✅\nOrder *{orderNumber}* is confirmed and will be dispatched soon. Thank you!',
  refunded:
    'Dear {name}, the amount of *{total}* for order *{orderNumber}* has been refunded.\nFor any questions, please reply in this chat. {storeName}',
  orderPlaced:
    'Hello {name}!\nThank you for ordering from {storeName}.\n\nOrder number: *{orderNumber}*\n{items}\nTotal: *{total}* ({paymentMethod})\n\nPlease reply *YES* to confirm your order.',
  confirmed:
    'Dear {name}, your order *{orderNumber}* is confirmed ✅\nWe are preparing your jewellery for dispatch to {city}.\nTotal: {total}',
  shipped:
    'Good news {name}! 🚚\nYour order *{orderNumber}* has been shipped.\nCourier: {courier}\nTracking number: *{tracking}*',
  delivered:
    'Dear {name}, your order *{orderNumber}* has been delivered 💍\nWe hope you love your new jewellery.\nThank you for choosing {storeName}!',
  cancelled:
    'Dear {name}, your order *{orderNumber}* has been cancelled.\nIf this was a mistake, please reply to this message and we will help you.',
  paymentReminder:
    'Dear {name}, the payment of *{total}* for order *{orderNumber}* is still pending.\nAfter paying, please send the payment screenshot in this chat. Thank you!',
};

export const TEMPLATE_META: Record<WhatsAppTemplateKey, { label: string; hint: string }> = {
  orderPlaced: { label: 'Order Confirmation', hint: 'Ask a new customer to confirm their order' },
  confirmed: { label: 'Order Confirmed', hint: 'After the customer replies YES' },
  processing: { label: 'Preparing Order', hint: 'Order is being checked and packed' },
  shipped: { label: 'Shipped + Tracking', hint: 'Includes courier and tracking number' },
  delivered: { label: 'Delivered / Thank You', hint: 'After delivery is complete' },
  cancelled: { label: 'Cancelled', hint: 'Let the customer know the order was cancelled' },
  paymentReminder: { label: 'Payment Reminder', hint: 'For pending online / bank payments' },
  paymentReceived: { label: 'Payment Received', hint: 'After you verify the payment screenshot' },
  refunded: { label: 'Refunded', hint: 'Money returned to the customer' },
};

export const PLACEHOLDERS = [
  '{name}',
  '{orderNumber}',
  '{total}',
  '{items}',
  '{city}',
  '{courier}',
  '{tracking}',
  '{paymentMethod}',
  '{storeName}',
];

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  online_card: 'Card Payment',
  online: 'Online Payment (JazzCash / EasyPaisa)',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
};

/** Converts Pakistani numbers (0300…, +92 300…, 0092…) to wa.me format: 923001234567. */
export function toWhatsAppNumber(phone: string): string {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(2);
  else if (d.startsWith('0')) d = `92${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  return d;
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

export function getTemplates(settings: StoreSettings | null | undefined): WhatsAppTemplates {
  return { ...DEFAULT_TEMPLATES, ...(settings?.whatsappTemplates || {}) };
}

/** Fills {placeholders} in a template with this order's details. */
export function renderTemplate(
  template: string,
  order: Order,
  settings: StoreSettings | null | undefined
): string {
  const symbol = settings?.currencySymbol || 'Rs.';
  const items = order.items
    .map((i) => `• ${i.name} × ${i.quantity} — ${formatPrice(i.subtotal, symbol)}`)
    .join('\n');
  const values: Record<string, string> = {
    name: order.shippingAddress.fullName.split(' ')[0] || order.shippingAddress.fullName,
    orderNumber: order.orderNumber,
    total: formatPrice(order.totalAmount, symbol),
    items,
    city: order.shippingAddress.city,
    courier: order.courierName || 'Leopards',
    tracking: order.trackingNumber || '(will be shared soon)',
    paymentMethod: PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod,
    storeName: settings?.storeName || 'MS Velora',
  };
  return template.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);
}

/** The template that fits an order's current state, for one-click suggestions. */
export function suggestedTemplate(order: Order): WhatsAppTemplateKey {
  const sent = new Set((order.whatsappLog || []).map((l) => l.template));
  switch (order.fulfillmentStatus) {
    case 'pending':
      return sent.has('orderPlaced') ? 'confirmed' : 'orderPlaced';
    case 'confirmed':
      return order.paymentStatus === 'paid' && order.paymentMethod !== 'cod' && !sent.has('paymentReceived')
        ? 'paymentReceived'
        : 'confirmed';
    case 'processing':
      return 'processing';
    case 'shipped':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    case 'refunded':
      return 'refunded';
    default:
      return 'cancelled';
  }
}

/** Customer → store message after placing a WhatsApp order. */
export function customerOrderMessage(order: Order, settings: StoreSettings | null | undefined): string {
  const symbol = settings?.currencySymbol || 'Rs.';
  const a = order.shippingAddress;
  return [
    `Hello ${settings?.storeName || 'MS Velora'}!`,
    'I would like to confirm my order.',
    '',
    `Order number: *${order.orderNumber}*`,
    ...order.items.map((i) => `• ${i.name} × ${i.quantity} — ${formatPrice(i.subtotal, symbol)}`),
    `Total: *${formatPrice(order.totalAmount, symbol)}* (${PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod})`,
    '',
    `Name: ${a.fullName}`,
    `Phone: ${a.phone}`,
    `Address: ${a.streetAddress}, ${a.city}`,
  ].join('\n');
}
