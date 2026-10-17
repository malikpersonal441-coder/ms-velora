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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ProductImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isMain: { type: Boolean, default: false },
}, { _id: false });
const ProductVariantSchema = new mongoose_1.Schema({
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    dialColor: { type: String, default: '' },
    strapMaterial: { type: String, default: '' },
    price: { type: Number },
    salePrice: { type: Number, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, default: '' },
}, { _id: true });
const ProductSpecificationsSchema = new mongoose_1.Schema({
    movement: { type: String, default: 'Necklace', index: true }, // Jewellery type
    caseMaterial: { type: String, default: 'Gold Plated Brass' }, // Metal
    caseDiameter: { type: String, default: 'Adjustable' }, // Size / length
    caseThickness: { type: String, default: 'Lightweight' }, // Weight
    strapMaterial: { type: String, default: 'High Polish', index: true }, // Finish
    strapWidth: { type: String, default: 'Lobster Clasp' }, // Closure
    dialColor: { type: String, default: 'Gold', index: true }, // Colour
    crystal: { type: String, default: 'Cubic Zirconia' }, // Stones
    waterResistance: { type: String, default: 'Keep away from water & perfume' }, // Care
    warranty: { type: String, default: 'Plating Warranty' },
    origin: { type: String, default: 'Pakistan' },
}, { _id: false });
const ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, maxlength: 180, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, default: '', trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category', index: true },
    collections: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Collection', index: true }],
    gender: {
        type: String,
        enum: ['Men', 'Women', 'Unisex'],
        default: 'Women',
        index: true,
    },
    price: { type: Number, required: true, min: 0, index: true },
    salePrice: { type: Number, default: null, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    shortDescription: { type: String, default: '', trim: true },
    description: { type: String, required: true },
    mainImage: { type: String, required: true },
    images: { type: [ProductImageSchema], default: [] },
    specifications: { type: ProductSpecificationsSchema, default: () => ({}) },
    variants: { type: [ProductVariantSchema], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0, index: true },
    reservedStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    soldCount: { type: Number, default: 0, min: 0, index: true },
    status: {
        type: String,
        enum: ['published', 'draft', 'archived'],
        default: 'published',
        index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    bestSeller: { type: Boolean, default: false, index: true },
    newArrival: { type: Boolean, default: false, index: true },
    tags: [{ type: String, trim: true }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
}, { timestamps: true });
ProductSchema.index({
    name: 'text',
    brand: 'text',
    model: 'text',
    sku: 'text',
    description: 'text',
    tags: 'text',
});
exports.Product = mongoose_1.default.model('Product', ProductSchema);
