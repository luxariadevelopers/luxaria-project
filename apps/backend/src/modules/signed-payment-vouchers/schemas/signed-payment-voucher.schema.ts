import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SignedPaymentVoucherDocument =
  HydratedDocument<SignedPaymentVoucher>;

export enum SignedPaymentVoucherType {
  Labour = 'labour',
  CashPayment = 'cash_payment',
}

export enum SignedPaymentVoucherStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Posted = 'posted',
  Reversed = 'reversed',
  Cancelled = 'cancelled',
  Returned = 'returned',
}

@Schema({
  collection: 'signed_payment_vouchers',
  timestamps: true,
})
export class SignedPaymentVoucher {
  @Prop({ required: true, unique: true, trim: true, index: true })
  voucherNumber!: string;

  @Prop({
    type: String,
    enum: SignedPaymentVoucherType,
    required: true,
    index: true,
  })
  voucherType!: SignedPaymentVoucherType;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CashAccount',
    required: true,
    index: true,
  })
  pettyCashAccountId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  recipientName!: string;

  @Prop({ type: String, trim: true, default: null })
  recipientMobile!: string | null;

  @Prop({ required: true, trim: true })
  workDescription!: string;

  @Prop({ type: Number, required: true, min: 0 })
  grossAmount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  deductions!: number;

  @Prop({ type: Number, required: true, min: 0 })
  netAmount!: number;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  recipientSignatureDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  recipientSignatureChecksum!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  engineerSignatureDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  engineerSignatureChecksum!: string | null;

  @Prop({ type: Boolean, default: false })
  requiresWitnessSignature!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  witnessSignatureDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  witnessSignatureChecksum!: string | null;

  @Prop({ type: Boolean, default: false })
  requiresRecipientPhoto!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  recipientPhotoDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  recipientPhotoChecksum!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  voucherPdfDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  voucherPdfChecksum!: string | null;

  @Prop({ type: Number, default: null })
  latitude!: number | null;

  @Prop({ type: Number, default: null })
  longitude!: number | null;

  /** Capture date/time of signatures / payment event */
  @Prop({ type: Date, required: true, index: true })
  capturedAt!: Date;

  @Prop({ type: String, trim: true, default: null })
  deviceId!: string | null;

  @Prop({
    type: String,
    enum: SignedPaymentVoucherStatus,
    default: SignedPaymentVoucherStatus.Draft,
    index: true,
  })
  status!: SignedPaymentVoucherStatus;

  @Prop({ type: String, trim: true, default: null, index: true })
  idempotencyKey!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  reversalJournalEntryId!: Types.ObjectId | null;

  /** Voucher this one replaces (after reverse) */
  @Prop({
    type: Types.ObjectId,
    ref: 'SignedPaymentVoucher',
    default: null,
    index: true,
  })
  replacesVoucherId!: Types.ObjectId | null;

  /** Replacement created after this voucher was reversed */
  @Prop({
    type: Types.ObjectId,
    ref: 'SignedPaymentVoucher',
    default: null,
  })
  replacementVoucherId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reversedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reversedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  reversalReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;
}

export const SignedPaymentVoucherSchema = SchemaFactory.createForClass(
  SignedPaymentVoucher,
);

SignedPaymentVoucherSchema.plugin(baseSchemaPlugin);
SignedPaymentVoucherSchema.plugin(softDeletePlugin);

SignedPaymentVoucherSchema.index({ projectId: 1, status: 1, capturedAt: -1 });
SignedPaymentVoucherSchema.index(
  { idempotencyKey: 1 },
  {
    name: 'uniq_spv_idempotency_key',
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
  },
);
