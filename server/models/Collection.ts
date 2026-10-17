import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  image: string;
  bannerImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  featured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    subtitle: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, required: true },
    bannerImage: { type: String, default: '' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    featured: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Collection = mongoose.model<ICollection>('Collection', CollectionSchema);
