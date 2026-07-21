import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContributionReceiptDocument = HydratedDocument<ContributionReceipt>;

export enum ContributionPaymentMode {
  BankTransfer = 'bank_transfer',
  Cheque = 'cheque',
  Cash = 'cash',
  LoanAdjustment = 'loan_adjustment',
  JournalAdjustment = 'journal_adjustment',
}

export enum ContributionReceiptStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Verified = 'verified',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'contribution_receipts',
  timestamps: true,
})
export class ContributionReceipt {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  receiptNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Project participant record */
  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectParticipant',
    required: true,
    index: true,
  })
  participantId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContributionCommitment',
    required: true,
    index: true,
  })
  commitmentId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  receivedDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({
    type: String,
    enum: ContributionPaymentMode,
    required: true,
    index: true,
  })
  paymentMode!: ContributionPaymentMode;

  /** Company/project bank account receiving funds (module pending — ObjectId) */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  bankAccountId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  transactionReference!: string | null;

  /** Relative path to uploaded or generated receipt document */
  @Prop({ type: String, trim: true, default: null })
  receiptDocument!: string | null;

  /** Generated PDF path (may equal receiptDocument) */
  @Prop({ type: String, trim: true, default: null })
  receiptPdfPath!: string | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  @Prop({
    type: String,
    enum: ContributionReceiptStatus,
    default: ContributionReceiptStatus.Draft,
    index: true,
  })
  status!: ContributionReceiptStatus;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  /** Posted contribution journal (Dr Bank/Cash · Cr Investor/Director). */
  @Prop({ type: Types.ObjectId, default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false })
  balancesApplied!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContributionReceiptSchema =
  SchemaFactory.createForClass(ContributionReceipt);

ContributionReceiptSchema.plugin(baseSchemaPlugin);
ContributionReceiptSchema.plugin(softDeletePlugin);

ContributionReceiptSchema.index({ projectId: 1, status: 1, receivedDate: -1 });
ContributionReceiptSchema.index({ projectId: 1, participantId: 1, status: 1 });
ContributionReceiptSchema.index({ commitmentId: 1, status: 1 });

/**
 * Prevent duplicate transaction references within the same bank account
 * for non-cancelled receipts.
 */
ContributionReceiptSchema.index(
  { bankAccountId: 1, transactionReference: 1 },
  {
    name: 'unique_txn_ref_per_bank_account',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      bankAccountId: { $type: 'objectId' },
      transactionReference: { $type: 'string' },
      status: {
        $in: [
          ContributionReceiptStatus.Draft,
          ContributionReceiptStatus.Submitted,
          ContributionReceiptStatus.Verified,
          ContributionReceiptStatus.Posted,
        ],
      },
    },
  },
);
