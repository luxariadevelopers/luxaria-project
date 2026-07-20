import mongoose, { Schema, Types } from 'mongoose';

export interface ISaleUnit {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  clientName: string;
  phone?: string;
  block: string;
  plot: string;
  fundingType: 'OWN_FUND' | 'BANK_LOAN';
  freezeStatus: 'ENQUIRY' | 'TOKEN' | 'BOOKED' | 'CANCELLED';
  totalValuePaise: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaleAdvance {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  saleUnitId: Types.ObjectId;
  amountPaise: number;
  accountId: Types.ObjectId;
  date: Date;
  utilizedPaise: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientInvoice {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  saleUnitId: Types.ObjectId;
  invoiceNumber: string;
  invoiceDate: Date;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  invoiceFileId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleUnitSchema = new Schema<ISaleUnit>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    clientName: { type: String, required: true },
    phone: String,
    block: { type: String, required: true },
    plot: { type: String, required: true },
    fundingType: { type: String, enum: ['OWN_FUND', 'BANK_LOAN'], default: 'OWN_FUND' },
    freezeStatus: { type: String, enum: ['ENQUIRY', 'TOKEN', 'BOOKED', 'CANCELLED'], default: 'TOKEN' },
    totalValuePaise: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SaleAdvanceSchema = new Schema<ISaleAdvance>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    saleUnitId: { type: Schema.Types.ObjectId, ref: 'SaleUnit', required: true },
    amountPaise: { type: Number, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    date: { type: Date, required: true },
    utilizedPaise: { type: Number, default: 0 },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const ClientInvoiceSchema = new Schema<IClientInvoice>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    saleUnitId: { type: Schema.Types.ObjectId, ref: 'SaleUnit', required: true },
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    taxablePaise: { type: Number, required: true },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
    invoiceFileId: { type: Schema.Types.ObjectId, ref: 'AuditFile' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const SaleUnit = mongoose.model<ISaleUnit>('SaleUnit', SaleUnitSchema);
export const SaleAdvance = mongoose.model<ISaleAdvance>('SaleAdvance', SaleAdvanceSchema);
export const ClientInvoice = mongoose.model<IClientInvoice>('ClientInvoice', ClientInvoiceSchema);
