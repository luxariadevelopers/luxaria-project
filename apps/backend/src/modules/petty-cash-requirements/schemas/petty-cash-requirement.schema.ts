import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type PettyCashRequirementDocument =
  HydratedDocument<PettyCashRequirement>;

export enum PettyCashRequirementStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  ProjectManagerReview = 'project_manager_review',
  FinanceReview = 'finance_review',
  Approved = 'approved',
  Funded = 'funded',
  Closed = 'closed',
  Rejected = 'rejected',
  Returned = 'returned',
  Cancelled = 'cancelled',
}

export enum PettyCashExpenseCategory {
  Travel = 'travel',
  Transport = 'transport',
  Food = 'food',
  Materials = 'materials',
  Labour = 'labour',
  Tools = 'tools',
  Utilities = 'utilities',
  SiteMisc = 'site_misc',
  Other = 'other',
}

@Schema({ _id: true })
export class PettyCashRequirementItem {
  @Prop({
    type: String,
    enum: PettyCashExpenseCategory,
    required: true,
  })
  expenseCategory!: PettyCashExpenseCategory;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: Number, required: true, min: 0 })
  estimatedAmount!: number;
}

export const PettyCashRequirementItemSchema = SchemaFactory.createForClass(
  PettyCashRequirementItem,
);

@Schema({
  collection: 'petty_cash_requirements',
  timestamps: true,
})
export class PettyCashRequirement {
  @Prop({ required: true, unique: true, trim: true, index: true })
  requestNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CashAccount',
    required: true,
    index: true,
  })
  pettyCashAccountId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  weekStartDate!: Date;

  @Prop({ type: Date, required: true })
  weekEndDate!: Date;

  /** Snapshot of petty-cash balance at create/submit */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  currentCashBalance!: number;

  /**
   * Prior funded-but-not-closed float still awaiting expense settlement.
   * Snapshotted at submit for auditability.
   */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  previousUnsettledAmount!: number;

  @Prop({ type: [String], default: [] })
  warnings!: string[];

  @Prop({ type: Number, required: true, min: 0 })
  requestedAmount!: number;

  /** Set on finance approval — may differ from requestedAmount */
  @Prop({ type: Number, default: null, min: 0 })
  approvedAmount!: number | null;

  @Prop({ type: Number, default: null, min: 0 })
  fundedAmount!: number | null;

  @Prop({ type: [PettyCashRequirementItemSchema], default: [] })
  requirementItems!: PettyCashRequirementItem[];

  @Prop({ type: String, trim: true, required: true })
  justification!: string;

  @Prop({
    type: String,
    enum: PettyCashRequirementStatus,
    default: PettyCashRequirementStatus.Draft,
    index: true,
  })
  status!: PettyCashRequirementStatus;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  projectManagerReviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  projectManagerReviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  financeReviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  financeReviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  fundedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  fundedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  closedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;
}

export const PettyCashRequirementSchema = SchemaFactory.createForClass(
  PettyCashRequirement,
);

PettyCashRequirementSchema.plugin(baseSchemaPlugin);
PettyCashRequirementSchema.plugin(softDeletePlugin);

PettyCashRequirementSchema.index(
  { pettyCashAccountId: 1, weekStartDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          PettyCashRequirementStatus.Draft,
          PettyCashRequirementStatus.Submitted,
          PettyCashRequirementStatus.ProjectManagerReview,
          PettyCashRequirementStatus.FinanceReview,
          PettyCashRequirementStatus.Approved,
          PettyCashRequirementStatus.Funded,
          PettyCashRequirementStatus.Closed,
          PettyCashRequirementStatus.Returned,
        ],
      },
      isDeleted: false,
    },
  },
);

PettyCashRequirementSchema.index({ projectId: 1, status: 1, weekStartDate: -1 });
