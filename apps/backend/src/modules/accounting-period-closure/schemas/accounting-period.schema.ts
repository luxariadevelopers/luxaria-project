import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  AccountingPeriodStatus,
  AccountingPeriodType,
  PeriodChecklistItemKey,
  PeriodChecklistItemStatus,
  type PeriodChecklistIssue,
} from '../accounting-period-closure.constants';

export type AccountingPeriodDocument = HydratedDocument<AccountingPeriod>;

@Schema({ _id: false })
export class PeriodChecklistItemEmbedded {
  @Prop({ type: String, enum: PeriodChecklistItemKey, required: true })
  key!: PeriodChecklistItemKey;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({
    type: String,
    enum: PeriodChecklistItemStatus,
    required: true,
    default: PeriodChecklistItemStatus.Pending,
  })
  status!: PeriodChecklistItemStatus;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  issueCount!: number;

  @Prop({ type: [Object], default: [] })
  issues!: PeriodChecklistIssue[];

  @Prop({ type: Date, default: null })
  checkedAt!: Date | null;
}

export const PeriodChecklistItemEmbeddedSchema = SchemaFactory.createForClass(
  PeriodChecklistItemEmbedded,
);

@Schema({
  collection: 'accounting_periods',
  timestamps: true,
})
export class AccountingPeriod {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  periodNumber!: string;

  @Prop({
    type: String,
    enum: AccountingPeriodType,
    required: true,
    index: true,
  })
  periodType!: AccountingPeriodType;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'FinancialYear',
    required: true,
    index: true,
  })
  financialYearId!: Types.ObjectId;

  /** Calendar year for monthly periods */
  @Prop({ type: Number, default: null, index: true })
  year!: number | null;

  /** 1–12 for monthly periods */
  @Prop({ type: Number, default: null, min: 1, max: 12, index: true })
  month!: number | null;

  @Prop({ type: Date, required: true, index: true })
  periodFrom!: Date;

  @Prop({ type: Date, required: true, index: true })
  periodTo!: Date;

  @Prop({
    type: String,
    enum: AccountingPeriodStatus,
    required: true,
    default: AccountingPeriodStatus.Open,
    index: true,
  })
  status!: AccountingPeriodStatus;

  @Prop({ type: [PeriodChecklistItemEmbeddedSchema], default: [] })
  checklist!: PeriodChecklistItemEmbedded[];

  @Prop({ type: Date, default: null })
  validationRunAt!: Date | null;

  @Prop({ type: Boolean, default: false })
  validationPassed!: boolean;

  @Prop({ type: Date, default: null })
  lockedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  lockedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  closedBy!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AccountingPeriodSchema =
  SchemaFactory.createForClass(AccountingPeriod);

AccountingPeriodSchema.plugin(baseSchemaPlugin);
AccountingPeriodSchema.plugin(softDeletePlugin);

AccountingPeriodSchema.index(
  { financialYearId: 1, periodType: 1, year: 1, month: 1 },
  {
    unique: true,
    partialFilterExpression: {
      periodType: AccountingPeriodType.Monthly,
      isDeleted: false,
    },
  },
);

AccountingPeriodSchema.index(
  { financialYearId: 1, periodType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      periodType: AccountingPeriodType.FinancialYear,
      isDeleted: false,
    },
  },
);

AccountingPeriodSchema.index({ status: 1, periodFrom: 1, periodTo: 1 });
