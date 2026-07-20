import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  BankReconciliationSessionStatus,
  type StatementColumnMapping,
} from '../bank-reconciliation.constants';

export type BankReconciliationSessionDocument =
  HydratedDocument<BankReconciliationSession>;

@Schema({
  collection: 'bank_reconciliation_sessions',
  timestamps: true,
})
export class BankReconciliationSession {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  sessionNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyBankAccount',
    required: true,
    index: true,
  })
  bankAccountId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  ledgerAccountId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  statementFrom!: Date;

  @Prop({ type: Date, required: true, index: true })
  statementTo!: Date;

  @Prop({ type: Number, required: true, default: 0 })
  statementOpeningBalance!: number;

  @Prop({ type: Number, required: true, default: 0 })
  statementClosingBalance!: number;

  @Prop({ type: Object, default: null })
  columnMapping!: StatementColumnMapping | null;

  @Prop({ type: String, trim: true, default: null })
  sourceFileName!: string | null;

  @Prop({
    type: String,
    enum: BankReconciliationSessionStatus,
    required: true,
    default: BankReconciliationSessionStatus.Draft,
    index: true,
  })
  status!: BankReconciliationSessionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  completedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BankReconciliationSessionSchema = SchemaFactory.createForClass(
  BankReconciliationSession,
);

BankReconciliationSessionSchema.plugin(baseSchemaPlugin);
BankReconciliationSessionSchema.plugin(softDeletePlugin);
BankReconciliationSessionSchema.index({
  bankAccountId: 1,
  statementFrom: 1,
  statementTo: 1,
});
