import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type PaymentScheduleDocument = HydratedDocument<PaymentSchedule>;

export enum PaymentScheduleType {
  DateBased = 'date_based',
  ConstructionMilestone = 'construction_milestone',
  Custom = 'custom',
  BankDisbursement = 'bank_disbursement',
}

export enum PaymentScheduleStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Active = 'active',
  Superseded = 'superseded',
  Cancelled = 'cancelled',
  Rejected = 'rejected',
}

export enum PaymentScheduleLineStatus {
  Pending = 'pending',
  Due = 'due',
  Demanded = 'demanded',
  Overdue = 'overdue',
  Paid = 'paid',
  Waived = 'waived',
}

@Schema({ _id: true })
export class PaymentScheduleLine {
  _id?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  sequence!: number;

  /** Milestone / installment label (construction stage, bank tranche, etc.) */
  @Prop({ required: true, trim: true })
  milestone!: string;

  @Prop({ type: Date, default: null, index: true })
  dueDate!: Date | null;

  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  percentage!: number;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tax!: number;

  /** Cumulative collections applied against this line. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  collectedAmount!: number;

  @Prop({
    type: String,
    enum: PaymentScheduleLineStatus,
    required: true,
    default: PaymentScheduleLineStatus.Pending,
    index: true,
  })
  status!: PaymentScheduleLineStatus;

  @Prop({ type: Types.ObjectId, ref: 'PaymentDemand', default: null })
  demandId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  markedDueAt!: Date | null;

  @Prop({ type: Date, default: null })
  overdueAt!: Date | null;
}

export const PaymentScheduleLineSchema =
  SchemaFactory.createForClass(PaymentScheduleLine);

@Schema({
  collection: 'payment_schedules',
  timestamps: true,
})
export class PaymentSchedule {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  scheduleNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: PaymentScheduleType,
    required: true,
    index: true,
  })
  scheduleType!: PaymentScheduleType;

  /** Sale value this schedule covers (booking.approvedPrice). */
  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number;

  @Prop({ type: [PaymentScheduleLineSchema], default: [] })
  lines!: PaymentScheduleLine[];

  @Prop({
    type: String,
    enum: PaymentScheduleStatus,
    required: true,
    default: PaymentScheduleStatus.Draft,
    index: true,
  })
  status!: PaymentScheduleStatus;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  revisionNumber!: number;

  @Prop({ type: Types.ObjectId, ref: 'PaymentSchedule', default: null })
  rootScheduleId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'PaymentSchedule', default: null })
  revisedFromId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentScheduleSchema =
  SchemaFactory.createForClass(PaymentSchedule);

PaymentScheduleSchema.plugin(baseSchemaPlugin);
PaymentScheduleSchema.plugin(softDeletePlugin);

PaymentScheduleSchema.index({ bookingId: 1, status: 1 });
PaymentScheduleSchema.index({ projectId: 1, status: 1 });
PaymentScheduleSchema.index({ 'lines.dueDate': 1, 'lines.status': 1 });
PaymentScheduleSchema.index(
  { bookingId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: PaymentScheduleStatus.Active,
    },
    name: 'uniq_active_schedule_per_booking',
  },
);
