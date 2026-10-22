import mongoose, { Schema } from 'mongoose';

/** Named monotonically increasing sequences (e.g. approved order numbers). */
interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);

/**
 * Formats a sequence number into the luxury brand order format:
 * 1 -> MS-001, 2 -> MS-002, 99 -> MS-099, 100 -> MS-100, 1000 -> MS-1000
 */
export const formatOrderNumber = (seq: number): string => `MS-${String(seq).padStart(3, '0')}`;

/**
 * Atomically reserves the next number in a sequence. `$inc` with upsert is a single
 * server-side operation, so concurrent approvals can never receive the same number.
 */
export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc!.seq;
}

/**
 * Safely generates the next sequential order number starting at MS-001.
 * Initializes from the highest existing MS-XXX in the database if not yet initialized.
 */
export async function getNextOrderNumber(): Promise<string> {
  const existingCounter = await Counter.findById('orderNumber');
  if (!existingCounter) {
    let startSeq = 0;
    try {
      const OrderModel = mongoose.models.Order || mongoose.model('Order');
      const orders = await OrderModel.find({ orderNumber: /^MS-\d+$/ })
        .select('orderNumber')
        .lean();

      for (const ord of orders) {
        if (ord && typeof ord.orderNumber === 'string') {
          const m = ord.orderNumber.match(/^MS-(\d+)$/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num > startSeq) startSeq = num;
          }
        }
      }

      const oldCounter = await Counter.findById('approvedOrder');
      if (oldCounter && oldCounter.seq > startSeq) {
        startSeq = oldCounter.seq;
      }
    } catch {
      // Order model might not be initialized yet; fallback to starting at 0
    }

    await Counter.findByIdAndUpdate(
      'orderNumber',
      { $set: { seq: startSeq } },
      { upsert: true }
    );
  }

  const seq = await nextSequence('orderNumber');
  return formatOrderNumber(seq);
}
