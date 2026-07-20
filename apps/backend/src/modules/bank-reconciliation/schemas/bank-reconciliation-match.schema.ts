import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  BankReconciliationMatchCriterion,
  BankReconciliationMatchStatus,
  BankReconciliationMatchType,
} from '../bank-reconciliation.constants';

export type BankReconciliationMatchDocument =
  HydratedDocument<BankReconciliationMatch>;

@Schema({ _id: false })
export class BookLineSnapshot {
  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', required: true })
  journalId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  journalLineId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  journalNumber!: string;

  @Prop({ type: Date, required: true })
  journalDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  debit!: number;

  @Prop({ type: Number, required: true, min: 0 })
  credit!: number;

  @Prop({ type: String, trim: true, default: null })
  narration!: string | null;

  @Prop({ type: String, trim: true, default: null })
  lineDescription!: string | null;

  @Prop({ type: String, trim: true, default: null })
  sourceModule!: string | null;

  @Prop({ type: String, trim: true, default: null })
  sourceEntityId!: string | null;
}

export const BookLineSnapshotSchema =
  SchemaFactory.createForClass(BookLineSnapshot);

@Schema({
  collection: 'bank_reconciliation_matches',
  timestamps: true,
})
export class BankReconciliationMatch {
  @Prop({
    type: Types.ObjectId,
    ref: 'BankReconciliationSession',
    required: true,
    index: true,
  })
  sessionId!: Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'BankStatementLine' }],
    required: true,
  })
  statementLineIds!: Types.ObjectId[];

  @Prop({ type: [BookLineSnapshotSchema], required: true, default: [] })
  bookLines!: BookLineSnapshot[];

  @Prop({
    type: String,
    enum: BankReconciliationMatchType,
    required: true,
    index: true,
  })
  matchType!: BankReconciliationMatchType;

  @Prop({
    type: [String],
    enum: BankReconciliationMatchCriterion,
    default: [],
  })
  criteria!: BankReconciliationMatchCriterion[];

  @Prop({
    type: String,
    enum: BankReconciliationMatchStatus,
    required: true,
    default: BankReconciliationMatchStatus.Active,
    index: true,
  })
  status!: BankReconciliationMatchStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  matchedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date() })
  matchedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  undoneBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  undoneAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BankReconciliationMatchSchema = SchemaFactory.createForClass(
  BankReconciliationMatch,
);

BankReconciliationMatchSchema.plugin(baseSchemaPlugin);
BankReconciliationMatchSchema.plugin(softDeletePlugin);
BankReconciliationMatchSchema.index({ sessionId: 1, status: 1 });
BankReconciliationMatchSchema.index({ 'bookLines.journalLineId': 1, status: 1 });
