import mongoose, { Schema, Document } from 'mongoose';

export interface IStockMovement extends Document {
  product: mongoose.Types.ObjectId;
  sku: string;
  variantSku?: string;
  type: 'addition' | 'reduction' | 'order_placed' | 'order_cancelled' | 'manual_adjustment' | 'initial_seed';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason: string;
  orderId?: mongoose.Types.ObjectId;
  orderNumber?: string;
  performedBy?: mongoose.Types.ObjectId;
  performedByName?: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, index: true },
    variantSku: { type: String },
    type: {
      type: String,
      enum: ['addition', 'reduction', 'order_placed', 'order_cancelled', 'manual_adjustment', 'initial_seed'],
      required: true,
      index: true,
    },
    quantityChange: { type: Number, required: true },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    orderNumber: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, default: 'System' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
