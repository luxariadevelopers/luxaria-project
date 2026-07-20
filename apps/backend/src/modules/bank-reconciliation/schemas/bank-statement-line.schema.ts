import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BankStatementLineStatus } from '../bank-reconciliation.constants';

export type BankStatementLineDocument = HydratedDocument<BankStatementLine>;

@Schema({
  collection: 'bank_statement_lines',
  timestamps: true,
})
export class BankStatementLine {
  @Prop({
    type: Types.ObjectId,
    ref: 'BankReconciliationSession',
    required: true,
    index: true,
  })
  sessionId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyBankAccount',
    required: true,
    index: true,
  })
  bankAccountId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  lineNumber!: number;

  @Prop({ type: Date, required: true, index: true })
  txnDate!: Date;

  @Prop({ type: Date, default: null })
  valueDate!: Date | null;

  @Prop({ type: String, trim: true, default: '' })
  description!: string;

  /** Withdrawal / debit amount (absolute). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  debit!: number;

  /** Deposit / credit amount (absolute). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  credit!: number;

  @Prop({ type: Number, default: null })
  balance!: number | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  transactionId!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  chequeNumber!: string | null;

  /** Raw row snapshot for traceability. */
  @Prop({ type: Object, default: {} })
  raw!: Record<string, unknown>;

  @Prop({
    type: String,
    enum: BankStatementLineStatus,
    required: true,
    default: BankStatementLineStatus.Unmatched,
    index: true,
  })
  status!: BankStatementLineStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'BankReconciliationMatch',
    default: null,
    index: true,
  })
  matchId!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BankStatementLineSchema =
  SchemaFactory.createForClass(BankStatementLine);

BankStatementLineSchema.plugin(baseSchemaPlugin);
BankStatementLineSchema.plugin(softDeletePlugin);
BankStatementLineSchema.index({ sessionId: 1, lineNumber: 1 }, { unique: true });
BankStatementLineSchema.index({ sessionId: 1, status: 1, txnDate: 1 });
