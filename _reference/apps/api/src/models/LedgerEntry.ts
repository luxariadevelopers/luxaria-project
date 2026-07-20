import mongoose, { Schema, Types } from 'mongoose';

export interface ILedgerEntry {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  debitAccountId: Types.ObjectId;
  creditAccountId: Types.ObjectId;
  amountPaise: number;
  narration: string;
  refType: string;
  refId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    debitAccountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    creditAccountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    narration: { type: String, required: true },
    refType: { type: String, required: true },
    refId: { type: Schema.Types.ObjectId },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
