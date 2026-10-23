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

export const PAYMENT_LABEL: Record<string, string> = {
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

export const POPULAR_PAKISTANI_COURIERS = [
  'Leopards',
  'TCS',
  'Trax',
  'PostEx',
  'Call Courier',
  'M&P',
  'Rider',
  'Pakistan Post',
] as const;

/**
 * Returns a direct live tracking URL for common Pakistani courier services,
 * or falls back to MS Velora internal tracking page if tracking number / order number is present.
 */
export function getCourierTrackingUrl(
  courier: string,
  trackingNumber: string,
  orderNumber?: string
): string {
  const c = (courier || '').trim().toLowerCase();
  const tr = (trackingNumber || '').trim();

  if (c.includes('leopard')) {
    return tr ? `https://track.leopardscourier.com/track/${encodeURIComponent(tr)}` : 'https://track.leopardscourier.com';
  }
  if (c.includes('tcs')) {
    return tr ? `https://www.tcsexpress.com/tracking?tracking_no=${encodeURIComponent(tr)}` : 'https://www.tcsexpress.com/tracking';
  }
  if (c.includes('trax')) {
    return tr ? `https://trax.pk/tracking?tracking_id=${encodeURIComponent(tr)}` : 'https://trax.pk/tracking';
  }
  if (c.includes('postex')) {
    return tr ? `https://postex.pk/tracking?tracking_number=${encodeURIComponent(tr)}` : 'https://postex.pk/tracking';
  }
  if (c.includes('call courier') || c.includes('callcourier')) {
    return tr ? `https://callcourier.com.pk/tracking/?tc=${encodeURIComponent(tr)}` : 'https://callcourier.com.pk/tracking';
  }
  if (c.includes('m&p') || c.includes('mnp') || c.includes('muller')) {
    return tr ? `https://mulphilog.com/tracking/${encodeURIComponent(tr)}` : 'https://mulphilog.com';
  }
  if (c.includes('rider') || c.includes('withrider')) {
    return 'https://withrider.com';
  }
  if (c.includes('pakistan post') || c.includes('pak post')) {
    return 'https://ep.gov.pk';
  }
  if (orderNumber && typeof window !== 'undefined') {
    return `${window.location.origin}/track-order?orderNumber=${encodeURIComponent(orderNumber)}`;
  }
  return '';
}

export interface TrackingMessageOptions {
  order: Order;
  courier: string;
  trackingNumber: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  storeName?: string;
  currencySymbol?: string;
  language?: 'urdu' | 'english' | 'short';
}

export function buildTrackingWhatsAppMessage(opts: TrackingMessageOptions): string {
  const {
    order,
    courier,
    trackingNumber,
    trackingUrl,
    estimatedDelivery = '2-3 Working Days',
    storeName = 'MS Velora',
    currencySymbol = 'Rs.',
    language = 'urdu',
  } = opts;

  const name = order.shippingAddress.fullName.split(' ')[0] || order.shippingAddress.fullName;
  const city = order.shippingAddress.city || 'Pakistan';
  const total = formatPrice(order.totalAmount, currencySymbol);
  const payMethod = PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod;
  const cn = trackingNumber ? trackingNumber.trim() : '(Pending)';
  const linkText = trackingUrl ? `\n🔗 *Live Tracking Link:*\n${trackingUrl}` : '';

  if (language === 'english') {
    return (
      `Dear ${name},\n\n` +
      `Greetings from *${storeName}* Luxury Fine Jewellery! 💍✨\n\n` +
      `Your bespoke jewellery parcel (*${order.orderNumber}*) has been dispatched via insured courier delivery. 🚚📦\n\n` +
      `📋 *Shipment Details:*\n` +
      `• Courier Partner: *${courier}*\n` +
      `• Tracking Number (CN): *${cn}*\n` +
      `• Total Amount: *${total}* (${payMethod})\n` +
      `• Destination: *${city}*\n` +
      `• Estimated Delivery: *${estimatedDelivery}*` +
      linkText +
      `\n\n` +
      `Kindly inspect the security seal upon delivery. If you need any concierge assistance, please reply directly to this WhatsApp message.\n\n` +
      `Thank you for choosing *${storeName}* — Timeless Elegance. 🤍`
    );
  }

  if (language === 'short') {
    return (
      `Assalam-o-Alaikum ${name}! 💍\n` +
      `Aapka *${storeName}* order *${order.orderNumber}* ship ho chuka hai via *${courier}*.\n` +
      `Tracking ID: *${cn}*\n` +
      `Total: *${total}* (${payMethod})\n` +
      (trackingUrl ? `Track here: ${trackingUrl}\n` : '') +
      `Expected Delivery: ${estimatedDelivery}. Shukriya!`
    );
  }

  // Default: Urdu / Roman Urdu (Polite & Clear)
  return (
    `Assalam-o-Alaikum ${name}! 💍✨\n\n` +
    `Aapka *${storeName}* jewellery order *${order.orderNumber}* dispatch kar diya gaya hai! 🚚📦\n\n` +
    `📋 *Shipment Details:*\n` +
    `• Courier Service: *${courier}*\n` +
    `• Tracking Number (CN): *${cn}*\n` +
    `• Order Total: *${total}* (${payMethod})\n` +
    `• Shehar: *${city}*\n` +
    `• Expected Delivery: *${estimatedDelivery}*` +
    linkText +
    `\n\n` +
    `Rider delivery se pehle call karega, baraye meherbani exact amount ready rakhein.\n` +
    `Kisi bhi sawal ya rehnumai ke liye aap is WhatsApp par rabta kar saktay hain.\n\n` +
    `*${storeName}* par aetimad ka bohat shukriya! ✨`
  );
}
