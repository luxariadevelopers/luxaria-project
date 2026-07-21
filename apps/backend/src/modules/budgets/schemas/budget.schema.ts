import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type BudgetDocument = HydratedDocument<Budget>;

export enum BudgetStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Superseded = 'superseded',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class BudgetLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  accountId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CostCentre', default: null, index: true })
  costCentreId!: Types.ObjectId | null;

  /** 1–12 calendar month within the financial year (optional line spread). */
  @Prop({ type: Number, min: 1, max: 12, default: null })
  periodMonth!: number | null;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const BudgetLineSchema = SchemaFactory.createForClass(BudgetLine);

@Schema({
  collection: 'budgets',
  timestamps: true,
})
export class Budget {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  budgetNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'FinancialYear',
    required: true,
    index: true,
  })
  financialYearId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  version!: number;

  /** First budget in the revision chain (self for v1). */
  @Prop({ type: Types.ObjectId, ref: 'Budget', default: null, index: true })
  rootBudgetId!: Types.ObjectId | null;

  /** Prior version this budget revises (null for v1). */
  @Prop({ type: Types.ObjectId, ref: 'Budget', default: null, index: true })
  revisedFromId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: BudgetStatus,
    required: true,
    default: BudgetStatus.Draft,
    index: true,
  })
  status!: BudgetStatus;

  @Prop({ type: [BudgetLineSchema], default: [] })
  lines!: BudgetLine[];

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalAmount!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

BudgetSchema.plugin(baseSchemaPlugin);
BudgetSchema.plugin(softDeletePlugin);

BudgetSchema.index({ companyId: 1, financialYearId: 1, status: 1 });
BudgetSchema.index({ companyId: 1, projectId: 1, financialYearId: 1 });
BudgetSchema.index({ rootBudgetId: 1, version: -1 });
BudgetSchema.index({ 'lines.accountId': 1, status: 1 });
