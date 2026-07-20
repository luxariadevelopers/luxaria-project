import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type PettyCashFundTransferDocument =
  HydratedDocument<PettyCashFundTransfer>;

export enum PettyCashFundTransferStatus {
  Draft = 'draft',
  Verified = 'verified',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'petty_cash_fund_transfers',
  timestamps: true,
})
export class PettyCashFundTransfer {
  @Prop({ required: true, unique: true, trim: true, index: true })
  transferNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Weekly petty-cash requirement being funded */
  @Prop({
    type: Types.ObjectId,
    ref: 'PettyCashRequirement',
    required: true,
    index: true,
  })
  requestId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyBankAccount',
    required: true,
    index: true,
  })
  sourceBankAccountId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CashAccount',
    required: true,
    index: true,
  })
  destinationPettyCashAccountId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  transferDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, trim: true, default: null })
  transactionReference!: string | null;

  /** Relative path or document reference for payment proof */
  @Prop({ type: String, trim: true, default: null })
  paymentProof!: string | null;

  @Prop({
    type: String,
    enum: PettyCashFundTransferStatus,
    default: PettyCashFundTransferStatus.Draft,
    index: true,
  })
  status!: PettyCashFundTransferStatus;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

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
}

export const PettyCashFundTransferSchema = SchemaFactory.createForClass(
  PettyCashFundTransfer,
);

PettyCashFundTransferSchema.plugin(baseSchemaPlugin);
PettyCashFundTransferSchema.plugin(softDeletePlugin);

PettyCashFundTransferSchema.index({ projectId: 1, status: 1, transferDate: -1 });
PettyCashFundTransferSchema.index({ requestId: 1, status: 1 });
PettyCashFundTransferSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
  },
);
