import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContractorPaymentDocument = HydratedDocument<ContractorPayment>;

export enum ContractorPaymentStatus {
  Draft = 'draft',
  Approval = 'approval',
  Released = 'released',
  Verified = 'verified',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

export enum ContractorPaymentMode {
  BankTransfer = 'bank_transfer',
  Neft = 'neft',
  Rtgs = 'rtgs',
  Imps = 'imps',
  Upi = 'upi',
  Cheque = 'cheque',
  Other = 'other',
}

@Schema({ _id: true })
export class ContractorPaymentAllocation {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ContractorBill', required: true })
  billId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  billNumber!: string | null;

  @Prop({ type: Number, default: null })
  raNumber!: number | null;

  /** Amount of this payment applied to the bill (AP reduction). */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;
}

export const ContractorPaymentAllocationSchema = SchemaFactory.createForClass(
  ContractorPaymentAllocation,
);

@Schema({
  collection: 'contractor_payments',
  timestamps: true,
})
export class ContractorPayment {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  paymentNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    required: true,
    index: true,
  })
  contractorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'ContractorBill' }],
    default: [],
  })
  billIds!: Types.ObjectId[];

  @Prop({ type: [ContractorPaymentAllocationSchema], default: [] })
  allocations!: ContractorPaymentAllocation[];

  @Prop({ type: Date, required: true, index: true })
  paymentDate!: Date;

  /** Gross AP reduction (sum of allocations). */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({
    type: String,
    enum: ContractorPaymentMode,
    required: true,
  })
  paymentMode!: ContractorPaymentMode;

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
  advanceRecovery!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  penalty!: number;

  /** Net bank outflow = amount − tds − retention − advanceRecovery − penalty. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  bankAmount!: number;

  @Prop({ type: String, trim: true, default: null })
  paymentProof!: string | null;

  @Prop({
    type: String,
    enum: ContractorPaymentStatus,
    required: true,
    default: ContractorPaymentStatus.Draft,
    index: true,
  })
  status!: ContractorPaymentStatus;

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

export const ContractorPaymentSchema =
  SchemaFactory.createForClass(ContractorPayment);

ContractorPaymentSchema.plugin(baseSchemaPlugin);
ContractorPaymentSchema.plugin(softDeletePlugin);

ContractorPaymentSchema.index({ projectId: 1, status: 1, paymentDate: -1 });
ContractorPaymentSchema.index({ contractorId: 1, paymentDate: -1 });
ContractorPaymentSchema.index(
  { transactionReference: 1, bankAccountId: 1 },
  { unique: true, name: 'uniq_contractor_payment_txn_ref' },
);
ContractorPaymentSchema.index({
  paymentNumber: 'text',
  transactionReference: 'text',
});
