import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SiteExpenseVoucherDocument = HydratedDocument<SiteExpenseVoucher>;

export enum SiteExpensePaymentMode {
  Cash = 'cash',
  Upi = 'upi',
  BankTransfer = 'bank_transfer',
  Cheque = 'cheque',
  Other = 'other',
}

export enum SiteExpenseAttachmentType {
  Bill = 'bill',
  Photo = 'photo',
  Signature = 'signature',
  Other = 'other',
}

export enum SiteExpenseVoucherStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Verified = 'verified',
  Approved = 'approved',
  Posted = 'posted',
  Rejected = 'rejected',
  Returned = 'returned',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class SiteExpenseAttachment {
  @Prop({
    type: String,
    enum: SiteExpenseAttachmentType,
    required: true,
  })
  type!: SiteExpenseAttachmentType;

  @Prop({ type: String, trim: true, default: null })
  fileName!: string | null;

  /** Relative path or storage key */
  @Prop({ type: String, trim: true, default: null })
  filePath!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  documentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  mimeType!: string | null;
}

export const SiteExpenseAttachmentSchema = SchemaFactory.createForClass(
  SiteExpenseAttachment,
);

@Schema({
  collection: 'site_expense_vouchers',
  timestamps: true,
})
export class SiteExpenseVoucher {
  @Prop({ required: true, unique: true, trim: true, index: true })
  voucherNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CashAccount',
    required: true,
    index: true,
  })
  pettyCashAccountId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  expenseDate!: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'ExpenseCategory',
    required: true,
    index: true,
  })
  expenseCategoryId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, trim: true })
  paidTo!: string;

  @Prop({ type: String, trim: true, default: null })
  mobileNumber!: string | null;

  @Prop({ required: true, trim: true })
  purpose!: string;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  boqItemId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: SiteExpensePaymentMode,
    required: true,
    index: true,
  })
  paymentMode!: SiteExpensePaymentMode;

  @Prop({ type: String, trim: true, default: null, index: true })
  billNumber!: string | null;

  @Prop({ type: Date, default: null })
  billDate!: Date | null;

  @Prop({ type: [SiteExpenseAttachmentSchema], default: [] })
  attachments!: SiteExpenseAttachment[];

  @Prop({ type: Number, default: null })
  latitude!: number | null;

  @Prop({ type: Number, default: null })
  longitude!: number | null;

  @Prop({ type: String, trim: true, default: null })
  deviceId!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({
    type: String,
    enum: SiteExpenseVoucherStatus,
    default: SiteExpenseVoucherStatus.Draft,
    index: true,
  })
  status!: SiteExpenseVoucherStatus;

  /** Soft warnings (backdated, GPS, duplicate bill) — do not block workflow */
  @Prop({ type: [String], default: [] })
  warnings!: string[];

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  /** Ledger account debited on post (expense or WIP) */
  @Prop({ type: Types.ObjectId, ref: 'Account', default: null })
  debitAccountId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;
}

export const SiteExpenseVoucherSchema = SchemaFactory.createForClass(
  SiteExpenseVoucher,
);

SiteExpenseVoucherSchema.plugin(baseSchemaPlugin);
SiteExpenseVoucherSchema.plugin(softDeletePlugin);

SiteExpenseVoucherSchema.index({ projectId: 1, status: 1, expenseDate: -1 });
SiteExpenseVoucherSchema.index({
  projectId: 1,
  billNumber: 1,
  status: 1,
});
SiteExpenseVoucherSchema.index(
  { idempotencyKey: 1 },
  {
    name: 'uniq_sev_idempotency_key',
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
  },
);
