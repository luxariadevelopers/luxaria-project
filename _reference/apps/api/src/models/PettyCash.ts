import mongoose, { Schema, Types } from 'mongoose';

export interface IPettyCashFloat {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  holderUserId: Types.ObjectId;
  accountId: Types.ObjectId;
  floatPaise: number;
  balancePaise: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPettyCashRequest {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  amountPaise: number;
  weekStart: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: Types.ObjectId;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PettyCashFloatSchema = new Schema<IPettyCashFloat>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    holderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    floatPaise: { type: Number, default: 0 },
    balancePaise: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const PettyCashRequestSchema = new Schema<IPettyCashRequest>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    weekStart: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
  },
  { timestamps: true }
);

export const PettyCashFloat = mongoose.model<IPettyCashFloat>('PettyCashFloat', PettyCashFloatSchema);
export const PettyCashRequest = mongoose.model<IPettyCashRequest>('PettyCashRequest', PettyCashRequestSchema);
