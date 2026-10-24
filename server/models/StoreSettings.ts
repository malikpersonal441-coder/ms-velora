import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreSettings extends Document {
  key: string;
  storeName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  standardShippingFee: number;
  expressShippingFee: number;
  handDeliveryFee: number;
  freeShippingThreshold: number;
  taxPercentage: number;
  allowGuestCheckout: boolean;
  enableCod: boolean;
  enableOnlinePayment: boolean;
  /** Sender block printed on shipping slips (falls back to store name/address/phone). */
  shipFrom: { name: string; address: string; city: string; phone: string };
  mobileWallets: {
    jazzcash: { enabled: boolean; accountTitle: string; accountNumber: string };
    easypaisa: { enabled: boolean; accountTitle: string; accountNumber: string };
    instructions: string;
  };
  enableBankTransfer: boolean;
  bankDetails: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappOrderingEnabled: boolean;
  whatsappTemplates: {
    orderPlaced: string;
    confirmed: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    paymentReminder: string;
    processing: string;
    paymentReceived: string;
    refunded: string;
  };
  showroomAddress: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube: string;
    tiktok: string;
  };
  policies: {
    shippingPolicy: string;
    returnPolicy: string;
    privacyPolicy: string;
    termsOfService: string;
  };
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema<IStoreSettings>(
  {
    key: { type: String, default: 'default', unique: true },
    storeName: { type: String, default: 'MS Velora' },
    tagline: { type: String, default: 'Fine Jewellery for Women' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    currency: { type: String, default: 'PKR' },
    currencySymbol: { type: String, default: 'Rs.' },
    timezone: { type: String, default: 'Asia/Karachi' },
    standardShippingFee: { type: Number, default: 350, min: 0 },
    expressShippingFee: { type: Number, default: 750, min: 0 },
    handDeliveryFee: { type: Number, default: 0, min: 0 },
    freeShippingThreshold: { type: Number, default: 25000, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0, max: 50 },
    allowGuestCheckout: { type: Boolean, default: true },
    enableCod: { type: Boolean, default: true },
    enableOnlinePayment: { type: Boolean, default: false },
    shipFrom: {
      name: { type: String, default: '', trim: true, maxlength: 80 },
      address: { type: String, default: '', trim: true, maxlength: 200 },
      city: { type: String, default: '', trim: true, maxlength: 60 },
      phone: { type: String, default: '', trim: true, maxlength: 30 },
    },
    // JazzCash / EasyPaisa: customer pays manually and sends a screenshot on WhatsApp
    mobileWallets: {
      jazzcash: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: 'MS Velora', trim: true, maxlength: 80 },
        accountNumber: { type: String, default: '0308 5060106', trim: true, maxlength: 40 },
      },
      easypaisa: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: 'MS Velora', trim: true, maxlength: 80 },
        accountNumber: { type: String, default: '0308 5060106', trim: true, maxlength: 40 },
      },
      instructions: {
        type: String,
        default: 'Send the exact amount, then share the payment screenshot with your order number on WhatsApp. We confirm your order once payment is verified.',
        maxlength: 500,
      },
    },
    enableBankTransfer: { type: Boolean, default: true },
    bankDetails: {
      type: String,
      default: 'Meezan Bank Limited — Account Title: MS Velora — IBAN: (add your IBAN in admin settings)',
    },
    contactEmail: { type: String, default: 'concierge@msvelora.pk' },
    contactPhone: { type: String, default: '+92 308 5060106' },
    whatsappNumber: { type: String, default: '+92 308 5060106' },
    whatsappOrderingEnabled: { type: Boolean, default: true },
    // Placeholders: {name} {orderNumber} {total} {items} {city} {courier} {tracking} {storeName} {paymentMethod}
    whatsappTemplates: {
      orderPlaced: {
        type: String,
        default: 'Hello {name}!\nThank you for ordering from {storeName}.\n\nOrder number: *{orderNumber}*\n{items}\nTotal: *{total}* ({paymentMethod})\n\nPlease reply *YES* to confirm your order.',
      },
      confirmed: {
        type: String,
        default: 'Dear {name}, your order *{orderNumber}* is confirmed ✅\nWe are preparing your jewellery for dispatch to {city}.\nTotal: {total}',
      },
      shipped: {
        type: String,
        default: 'Good news {name}! 🚚\nYour order *{orderNumber}* has been shipped.\nCourier: {courier}\nTracking number: *{tracking}*',
      },
      delivered: {
        type: String,
        default: 'Dear {name}, your order *{orderNumber}* has been delivered 💍\nWe hope you love your new jewellery.\nThank you for choosing {storeName}!',
      },
      cancelled: {
        type: String,
        default: 'Dear {name}, your order *{orderNumber}* has been cancelled.\nIf this was a mistake, please reply to this message and we will help you.',
      },
      processing: {
        type: String,
        default: 'Dear {name}, your order *{orderNumber}* is being prepared 📦\nWe are carefully checking and packing your jewellery. You will receive the tracking number once it ships.',
      },
      paymentReceived: {
        type: String,
        default: 'Dear {name}, we have received your payment of *{total}* ✅\nOrder *{orderNumber}* is confirmed and will be dispatched soon. Thank you!',
      },
      refunded: {
        type: String,
        default: 'Dear {name}, the amount of *{total}* for order *{orderNumber}* has been refunded.\nFor any questions, please reply in this chat. {storeName}',
      },
      paymentReminder: {
        type: String,
        default: 'Dear {name}, the payment of *{total}* for order *{orderNumber}* is still pending.\nAfter paying, please send the payment screenshot in this chat. Thank you!',
      },
    },
    showroomAddress: {
      type: String,
      default: 'Lahore, Pakistan',
    },
    socialLinks: {
      instagram: { type: String, default: 'https://instagram.com/msvelora' },
      facebook: { type: String, default: 'https://facebook.com/msvelora' },
      youtube: { type: String, default: 'https://youtube.com/@msvelora' },
      tiktok: { type: String, default: 'https://tiktok.com/@msvelora' },
    },
    policies: {
      shippingPolicy: {
        type: String,
        default:
          'All orders are dispatched in the signature MS Velora gift box via trusted courier partners (TCS / Leopards Overland). Standard delivery takes 2–4 business days nationwide across Pakistan; Express Insured Delivery arrives within 24–48 hours in major cities. Complimentary shipping is automatically applied on orders above Rs. 25,000.',
      },
      returnPolicy: {
        type: String,
        default:
          'We offer a 7-day inspection and exchange guarantee from the date of delivery. Jewellery must remain unworn and returned in its original MS Velora box with all tags included. Earrings cannot be exchanged for hygiene reasons.',
      },
      privacyPolicy: {
        type: String,
        default:
          'MS Velora respects your privacy. Customer contact, delivery, and order records are encrypted and strictly used for order fulfillment and customer support.',
      },
      termsOfService: {
        type: String,
        default:
          'All jewellery sold by MS Velora is covered by our plating and craftsmanship warranty. Prices are listed in Pakistani Rupees (PKR) and validated on the server at checkout.',
      },
    },
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
