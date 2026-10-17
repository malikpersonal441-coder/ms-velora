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
