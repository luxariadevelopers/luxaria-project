import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type FinancialYearUnlockRequestDocument =
  HydratedDocument<FinancialYearUnlockRequest>;

export enum UnlockRequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

/**
 * Unlock requires a reason and an approval by a user with financial_year.unlock.
 */
@Schema({
  collection: 'financial_year_unlock_requests',
  timestamps: true,
})
export class FinancialYearUnlockRequest {
  @Prop({ type: Types.ObjectId, ref: 'FinancialYear', required: true, index: true })
  financialYearId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy!: Types.ObjectId;

  @Prop({
    type: String,
    enum: UnlockRequestStatus,
    default: UnlockRequestStatus.Pending,
    index: true,
  })
  status!: UnlockRequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  approvalNote!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FinancialYearUnlockRequestSchema = SchemaFactory.createForClass(
  FinancialYearUnlockRequest,
);

FinancialYearUnlockRequestSchema.plugin(baseSchemaPlugin);
FinancialYearUnlockRequestSchema.plugin(softDeletePlugin);

FinancialYearUnlockRequestSchema.index({ financialYearId: 1, status: 1, createdAt: -1 });
