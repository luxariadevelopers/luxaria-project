import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { PeriodReopenRequestStatus } from '../accounting-period-closure.constants';

export type PeriodReopenRequestDocument = HydratedDocument<PeriodReopenRequest>;

@Schema({
  collection: 'accounting_period_reopen_requests',
  timestamps: true,
})
export class PeriodReopenRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'AccountingPeriod',
    required: true,
    index: true,
  })
  periodId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy!: Types.ObjectId;

  @Prop({
    type: String,
    enum: PeriodReopenRequestStatus,
    default: PeriodReopenRequestStatus.Pending,
    index: true,
  })
  status!: PeriodReopenRequestStatus;

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

export const PeriodReopenRequestSchema =
  SchemaFactory.createForClass(PeriodReopenRequest);

PeriodReopenRequestSchema.plugin(baseSchemaPlugin);
PeriodReopenRequestSchema.plugin(softDeletePlugin);

PeriodReopenRequestSchema.index({ periodId: 1, status: 1, createdAt: -1 });
