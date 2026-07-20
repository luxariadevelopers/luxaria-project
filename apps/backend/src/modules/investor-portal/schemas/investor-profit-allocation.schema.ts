import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type InvestorProfitAllocationDocument =
  HydratedDocument<InvestorProfitAllocation>;

export enum InvestorProfitAllocationStatus {
  Draft = 'draft',
  Approved = 'approved',
  Cancelled = 'cancelled',
}

/**
 * Profit allocated to a specific outside-investor participant on a project.
 * Distributed vs undistributed are derived: allocated − distributed.
 */
@Schema({
  collection: 'investor_profit_allocations',
  timestamps: true,
})
export class InvestorProfitAllocation {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectParticipant',
    required: true,
    index: true,
  })
  participantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Investor', required: true, index: true })
  investorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'FinancialYear', default: null })
  financialYearId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  periodLabel!: string | null;

  /** Total profit allocated to this investor for the period. */
  @Prop({ type: Number, required: true, min: 0 })
  allocatedAmount!: number;

  /** Cumulative amount paid / distributed to the investor. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  distributedAmount!: number;

  @Prop({
    type: String,
    enum: InvestorProfitAllocationStatus,
    required: true,
    default: InvestorProfitAllocationStatus.Draft,
    index: true,
  })
  status!: InvestorProfitAllocationStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InvestorProfitAllocationSchema = SchemaFactory.createForClass(
  InvestorProfitAllocation,
);

InvestorProfitAllocationSchema.plugin(baseSchemaPlugin);
InvestorProfitAllocationSchema.plugin(softDeletePlugin);
InvestorProfitAllocationSchema.index({
  projectId: 1,
  investorId: 1,
  status: 1,
});
