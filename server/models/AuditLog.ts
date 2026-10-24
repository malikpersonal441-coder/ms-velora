import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: 'product' | 'inventory' | 'order' | 'customer' | 'category' | 'collection' | 'coupon' | 'settings' | 'homepage' | 'auth' | 'expense';
  entityId?: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: { type: String, required: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: ['product', 'inventory', 'order', 'customer', 'category', 'collection', 'coupon', 'settings', 'homepage', 'auth', 'expense'],
      required: true,
      index: true,
    },
    entityId: { type: String },
    details: { type: String, required: true },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
