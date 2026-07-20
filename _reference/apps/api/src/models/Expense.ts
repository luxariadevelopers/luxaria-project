import mongoose, { Schema, Types } from 'mongoose';

export interface IExpense {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  accountId: Types.ObjectId;
  category: string;
  amountPaise: number;
  narration: string;
  expenseDate: Date;
  createdBy: Types.ObjectId;
  billFileId?: Types.ObjectId;
  voucherId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    category: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    narration: { type: String, required: true },
    expenseDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    billFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
  },
  { timestamps: true }
);

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
