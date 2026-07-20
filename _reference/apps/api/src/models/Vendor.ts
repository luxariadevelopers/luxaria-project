import mongoose, { Schema, Types } from 'mongoose';
import type { BillStatus, PaymentTerms } from '@luxaria/shared';

export interface IVendor {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  gstin?: string;
  phone?: string;
  paymentTerms: PaymentTerms;
  agreementFileId?: Types.ObjectId;
  balancePaise: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchaseRequest {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  materialId?: Types.ObjectId;
  description: string;
  qty: number;
  unit: string;
  status: 'OPEN' | 'ORDERED' | 'CLOSED';
  requestedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendorBill {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  vendorId: Types.ObjectId;
  billNumber: string;
  billDate: Date;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  status: BillStatus;
  paidPaise: number;
  dueDate?: Date;
  billFileId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  vendorBillId?: Types.ObjectId;
  accountId: Types.ObjectId;
  amountPaise: number;
  transactionId?: string;
  paymentDate: Date;
  receiptFileId?: Types.ObjectId;
  type: 'VENDOR' | 'GST_CHALLAN' | 'OTHER';
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    gstin: String,
    phone: String,
    paymentTerms: { type: String, enum: ['AGAINST_BILL', 'WEEKLY', 'MONTHLY'], default: 'AGAINST_BILL' },
    agreementFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    balancePaise: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PurchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material' },
    description: { type: String, required: true },
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
    status: { type: String, enum: ['OPEN', 'ORDERED', 'CLOSED'], default: 'OPEN' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const VendorBillSchema = new Schema<IVendorBill>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    billNumber: { type: String, required: true },
    billDate: { type: Date, required: true },
    taxablePaise: { type: Number, required: true },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
    status: { type: String, enum: ['UNCLEARED', 'PARTIAL', 'CLEARED'], default: 'UNCLEARED' },
    paidPaise: { type: Number, default: 0 },
    dueDate: Date,
    billFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const PaymentSchema = new Schema<IPayment>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    vendorBillId: { type: Schema.Types.ObjectId, ref: 'VendorBill' },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    amountPaise: { type: Number, required: true },
    transactionId: String,
    paymentDate: { type: Date, required: true },
    receiptFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    type: { type: String, enum: ['VENDOR', 'GST_CHALLAN', 'OTHER'], default: 'VENDOR' },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
export const PurchaseRequest = mongoose.model<IPurchaseRequest>('PurchaseRequest', PurchaseRequestSchema);
export const VendorBill = mongoose.model<IVendorBill>('VendorBill', VendorBillSchema);
export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
