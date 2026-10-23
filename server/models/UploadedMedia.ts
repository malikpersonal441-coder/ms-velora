import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadedMedia extends Document {
  filename: string;
  originalName: string;
  contentType: string;
  data: Buffer;
  size: number;
  createdAt: Date;
}

const UploadedMediaSchema = new Schema<IUploadedMedia>(
  {
    filename: { type: String, required: true, unique: true, index: true },
    originalName: { type: String, default: '' },
    contentType: { type: String, required: true, default: 'image/jpeg' },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const UploadedMedia =
  mongoose.models.UploadedMedia ||
  mongoose.model<IUploadedMedia>('UploadedMedia', UploadedMediaSchema);
