import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  brand: string;
  sku: string;
  variantSku?: string;
  variantName?: string;
  image: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface IShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  notes?: string;
}

export interface IOrderStatusHistory {
  status: string;
  paymentStatus?: string;
  note: string;
  updatedBy?: string;
  timestamp: Date;
}

export type OrderFulfillmentStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderSource = 'website' | 'whatsapp' | 'manual';

/** standard/express = courier; hand = own rider / by-hand delivery; pickup = customer collects. */
export type ShippingMethod = 'standard' | 'express' | 'hand' | 'pickup';
export const SHIPPING_METHODS: ShippingMethod[] = ['standard', 'express', 'hand', 'pickup'];

export interface IWhatsAppLogEntry {
  template: string;
  message: string;
  phone: string;
  sentBy: string;
  sentAt: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  /** Reference given at checkout (REQ-xxxx); kept after approval so old links still work. */
  requestNumber?: string;
  approvedAt?: Date;
  idempotencyKey?: string;
  user?: mongoose.Types.ObjectId | null;
  isGuest: boolean;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  shippingMethod: ShippingMethod;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: 'cod' | 'online_card' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'online';
  paymentStatus: OrderPaymentStatus;
  paymentReference?: string;
  paidAt?: Date;
  fulfillmentStatus: OrderFulfillmentStatus;
  courierName?: string;
  /** Rider / person handing over the parcel (hand delivery). */
  deliveryPerson?: string;
  deliveryPhone?: string;
  /** Where a manual order came from: Instagram, phone call, walk-in… */
  manualChannel?: string;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  inventoryRestored: boolean;
  statusHistory: IOrderStatusHistory[];
  orderSource: OrderSource;
  whatsappLog: IWhatsAppLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    brand: { type: String, required: true },
    sku: { type: String, required: true },
    variantSku: { type: String },
    variantName: { type: String },
    image: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, default: '', trim: true },
    postalCode: { type: String, default: '', trim: true },
    country: { type: String, default: 'Pakistan' },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: { type: String, required: true },
    paymentStatus: { type: String },
    note: { type: String, required: true },
    updatedBy: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WhatsAppLogSchema = new Schema<IWhatsAppLogEntry>(
  {
    template: { type: String, required: true },
    message: { type: String, required: true, maxlength: 4000 },
    phone: { type: String, required: true },
    sentBy: { type: String, default: 'Admin' },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    requestNumber: { type: String, unique: true, sparse: true, uppercase: true },
    approvedAt: { type: Date },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isGuest: { type: Boolean, default: false },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    shippingMethod: { type: String, enum: SHIPPING_METHODS, default: 'standard' },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true },
    shippingCost: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR' },
    paymentMethod: {
      type: String,
      // online_card kept only so historical orders stay valid; new orders cannot use it
      enum: ['cod', 'online_card', 'bank_transfer', 'jazzcash', 'easypaisa', 'online'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentReference: { type: String },
    paidAt: { type: Date },
    fulfillmentStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    courierName: { type: String, default: '' },
    deliveryPerson: { type: String, default: '', trim: true, maxlength: 80 },
    deliveryPhone: { type: String, default: '', trim: true, maxlength: 30 },
    manualChannel: { type: String, default: '', trim: true, maxlength: 40 },
    trackingNumber: { type: String, default: '' },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
    inventoryRestored: { type: Boolean, default: false },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    orderSource: { type: String, enum: ['website', 'whatsapp', 'manual'], default: 'website', index: true },
    whatsappLog: { type: [WhatsAppLogSchema], default: [] },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
