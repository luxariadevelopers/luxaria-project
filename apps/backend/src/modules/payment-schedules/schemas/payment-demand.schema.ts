import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type PaymentDemandDocument = HydratedDocument<PaymentDemand>;

export enum PaymentDemandStatus {
  Issued = 'issued',
  Cancelled = 'cancelled',
  Settled = 'settled',
}

@Schema({
  collection: 'payment_demands',
  timestamps: true,
})
export class PaymentDemand {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  demandNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'PaymentSchedule',
    required: true,
    index: true,
  })
  scheduleId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  lineId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  milestone!: string;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tax!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number;

  /** Cumulative collections applied against this demand. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  collectedAmount!: number;

  @Prop({
    type: String,
    enum: PaymentDemandStatus,
    required: true,
    default: PaymentDemandStatus.Issued,
    index: true,
  })
  status!: PaymentDemandStatus;

  @Prop({ type: Date, required: true })
  issuedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  issuedBy!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentDemandSchema = SchemaFactory.createForClass(PaymentDemand);

PaymentDemandSchema.plugin(baseSchemaPlugin);
PaymentDemandSchema.plugin(softDeletePlugin);

PaymentDemandSchema.index({ scheduleId: 1, lineId: 1 });
PaymentDemandSchema.index({ dueDate: 1, status: 1 });
