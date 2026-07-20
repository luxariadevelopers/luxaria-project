import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type VendorPaymentDocument = HydratedDocument<VendorPayment>;

export enum VendorPaymentStatus {
  Draft = 'draft',
  Approval = 'approval',
  Released = 'released',
  Verified = 'verified',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

export enum VendorPaymentMode {
  BankTransfer = 'bank_transfer',
  Neft = 'neft',
  Rtgs = 'rtgs',
  Imps = 'imps',
  Upi = 'upi',
  Cheque = 'cheque',
  Other = 'other',
}

@Schema({ _id: true })
export class VendorPaymentAllocation {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'VendorInvoice', required: true })
  invoiceId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  invoiceDocumentNumber!: string | null;

  @Prop({ type: String, trim: true, default: null })
  invoiceNumber!: string | null;

  /** Amount of this payment applied to the invoice (AP reduction). */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;
}

export const VendorPaymentAllocationSchema = SchemaFactory.createForClass(
  VendorPaymentAllocation,
);

@Schema({
  collection: 'vendor_payments',
  timestamps: true,
})
export class VendorPayment {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  paymentNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'VendorInvoice' }], default: [] })
  invoiceIds!: Types.ObjectId[];

  @Prop({ type: [VendorPaymentAllocationSchema], default: [] })
  allocations!: VendorPaymentAllocation[];

  @Prop({ type: Date, required: true, index: true })
  paymentDate!: Date;

  /** Gross AP reduction (sum of allocations). */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({
    type: String,
    enum: VendorPaymentMode,
    required: true,
  })
  paymentMode!: VendorPaymentMode;

  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyBankAccount',
    required: true,
    index: true,
  })
  bankAccountId!: Types.ObjectId;

  /** Bank UTR / cheque / transaction ID — required. */
  @Prop({ required: true, trim: true })
  transactionReference!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tds!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  retention!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  deductions!: number;

  /** Net bank outflow = amount − tds − retention − deductions. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  bankAmount!: number;

  @Prop({ type: String, trim: true, default: null })
  paymentProof!: string | null;

  @Prop({
    type: String,
    enum: VendorPaymentStatus,
    required: true,
    default: VendorPaymentStatus.Draft,
    index: true,
  })
  status!: VendorPaymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  releasedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  releasedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorPaymentSchema = SchemaFactory.createForClass(VendorPayment);

VendorPaymentSchema.plugin(baseSchemaPlugin);
VendorPaymentSchema.plugin(softDeletePlugin);

VendorPaymentSchema.index({ projectId: 1, status: 1, paymentDate: -1 });
VendorPaymentSchema.index({ vendorId: 1, paymentDate: -1 });
VendorPaymentSchema.index(
  { transactionReference: 1, bankAccountId: 1 },
  { unique: true, name: 'uniq_vendor_payment_txn_ref' },
);
VendorPaymentSchema.index({ paymentNumber: 'text', transactionReference: 'text' });
