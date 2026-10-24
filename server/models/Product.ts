import mongoose, { Schema, Document } from 'mongoose';

export interface IProductImage {
  url: string;
  alt: string;
  isMain?: boolean;
}

export interface IProductVariant {
  _id?: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  dialColor?: string;
  strapMaterial?: string;
  price?: number;
  salePrice?: number | null;
  stock: number;
  image?: string;
}

export interface IProductSpecifications {
  movement: string;
  caseMaterial: string;
  caseDiameter: string;
  caseThickness: string;
  strapMaterial: string;
  strapWidth: string;
  dialColor: string;
  crystal: string;
  waterResistance: string;
  warranty: string;
  origin: string;
}

export interface IProduct {
  _id?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  brand: string;
  model: string;
  sku: string;
  category?: mongoose.Types.ObjectId;
  collections: mongoose.Types.ObjectId[];
  gender: 'Men' | 'Women' | 'Unisex';
  price: number;
  salePrice: number | null;
  costPrice: number;
  shortDescription: string;
  description: string;
  mainImage: string;
  tryOnImage?: string;
  images: IProductImage[];
  specifications: IProductSpecifications;
  variants: IProductVariant[];
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
  soldCount: number;
  status: 'published' | 'draft' | 'archived';
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  tags: string[];
  averageRating: number;
  reviewCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isMain: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    dialColor: { type: String, default: '' },
    strapMaterial: { type: String, default: '' },
    price: { type: Number },
    salePrice: { type: Number, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, default: '' },
  },
  { _id: true }
);

const ProductSpecificationsSchema = new Schema<IProductSpecifications>(
  {
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
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 180, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    brand: { type: String, default: 'MS Velora', trim: true, index: true },
    model: { type: String, default: '', trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    collections: [{ type: Schema.Types.ObjectId, ref: 'Collection', index: true }],
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
    tryOnImage: { type: String, default: '', trim: true },
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
  },
  { timestamps: true }
);

ProductSchema.index({
  name: 'text',
  brand: 'text',
  model: 'text',
  sku: 'text',
  description: 'text',
  tags: 'text',
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
