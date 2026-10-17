"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const OrderItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
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
}, { _id: false });
const ShippingAddressSchema = new mongoose_1.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: 'Pakistan' },
    notes: { type: String, default: '' },
}, { _id: false });
const OrderStatusHistorySchema = new mongoose_1.Schema({
    status: { type: String, required: true },
    paymentStatus: { type: String },
    note: { type: String, required: true },
    updatedBy: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });
const WhatsAppLogSchema = new mongoose_1.Schema({
    template: { type: String, required: true },
    message: { type: String, required: true, maxlength: 4000 },
    phone: { type: String, required: true },
    sentBy: { type: String, default: 'Admin' },
    sentAt: { type: Date, default: Date.now },
}, { _id: false });
const OrderSchema = new mongoose_1.Schema({
    orderNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    requestNumber: { type: String, unique: true, sparse: true, uppercase: true },
    approvedAt: { type: Date },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isGuest: { type: Boolean, default: false },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    shippingMethod: { type: String, enum: ['standard', 'express'], default: 'standard' },
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
    trackingNumber: { type: String, default: '' },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
    inventoryRestored: { type: Boolean, default: false },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    orderSource: { type: String, enum: ['website', 'whatsapp'], default: 'website', index: true },
    whatsappLog: { type: [WhatsAppLogSchema], default: [] },
}, { timestamps: true });
exports.Order = mongoose_1.default.model('Order', OrderSchema);
