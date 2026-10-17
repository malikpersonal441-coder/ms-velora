import mongoose, { Schema, Document } from 'mongoose';

export type PushTopic = 'new-arrivals' | 'admin-orders';

export interface IPushSubscription extends Document {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  topics: PushTopic[];
  /** Set for admin devices so only the admin receives order alerts. */
  user?: mongoose.Types.ObjectId | null;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    topics: { type: [String], enum: ['new-arrivals', 'admin-orders'], default: ['new-arrivals'], index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userAgent: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

export const PushSubscription = mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
