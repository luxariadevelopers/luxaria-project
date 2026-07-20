import mongoose, { Schema, Types } from 'mongoose';

export interface IVoucher {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  expenseId?: Types.ObjectId;
  payeeName: string;
  amountPaise: number;
  purpose: string;
  signatureFileId?: Types.ObjectId;
  voucherFileId?: Types.ObjectId;
  signedByName?: string;
  createdBy: Types.ObjectId;
  voucherDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    expenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
    payeeName: { type: String, required: true },
    amountPaise: { type: Number, required: true },
    purpose: { type: String, required: true },
    signatureFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    voucherFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    signedByName: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Voucher = mongoose.model<IVoucher>('Voucher', VoucherSchema);
