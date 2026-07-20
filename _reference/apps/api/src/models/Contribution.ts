import mongoose, { Schema, Types } from 'mongoose';
import type { ContributionMode } from '@luxaria/shared';

export interface IContribution {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  investorUserId: Types.ObjectId;
  investorType: 'DIRECTOR' | 'OUTSIDE';
  amountPaise: number;
  mode: ContributionMode;
  accountId: Types.ObjectId;
  profitSharePercent: number;
  date: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    investorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    investorType: { type: String, enum: ['DIRECTOR', 'OUTSIDE'], required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: ['cash', 'bank'], required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    profitSharePercent: { type: Number, required: true, min: 0, max: 100 },
    date: { type: Date, required: true },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Contribution = mongoose.model<IContribution>('Contribution', ContributionSchema);
