import mongoose, { Schema, Document } from 'mongoose';

export type ExpenseCategory =
  | 'courier_shipping'
  | 'packaging'
  | 'marketing_ads'
  | 'inventory_materials'
  | 'rent_utilities'
  | 'salaries'
  | 'repairs_maintenance'
  | 'miscellaneous';

export type ExpensePaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'easypaisa'
  | 'jazzcash'
  | 'credit_card';

export interface IExpense extends Document {
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: ExpensePaymentMethod;
  date: Date;
  referenceNumber?: string;
  notes?: string;
  loggedBy?: mongoose.Types.ObjectId;
  loggedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: [
        'courier_shipping',
        'packaging',
        'marketing_ads',
        'inventory_materials',
        'rent_utilities',
        'salaries',
        'repairs_maintenance',
        'miscellaneous',
      ],
      default: 'miscellaneous',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'credit_card'],
      default: 'cash',
    },
    date: { type: Date, default: Date.now, index: true },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    loggedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    loggedByName: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
