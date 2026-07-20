import mongoose, { Schema, Types } from 'mongoose';
import type { AccountType } from '@luxaria/shared';

export interface IAccount {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  name: string;
  type: AccountType;
  bankName?: string;
  accountNumberMasked?: string;
  holderUserId?: Types.ObjectId;
  balancePaise: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['BANK', 'CASH', 'PETTY_CASH', 'GST_INPUT', 'GST_OUTPUT', 'GST_PAYABLE', 'OTHER'],
      required: true,
    },
    bankName: String,
    accountNumberMasked: String,
    holderUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    balancePaise: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Account = mongoose.model<IAccount>('Account', AccountSchema);
