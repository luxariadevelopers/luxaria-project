import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SaleAgreementDocument = HydratedDocument<SaleAgreement>;

export enum SaleAgreementStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Executed = 'executed',
  Cancelled = 'cancelled',
  Superseded = 'superseded',
}

@Schema({ _id: false })
export class StampPaper {
  @Prop({ type: String, trim: true, default: null })
  series!: string | null;

  @Prop({ type: String, trim: true, default: null })
  number!: string | null;

  @Prop({ type: Date, default: null })
  purchasedOn!: Date | null;

  @Prop({ type: Number, min: 0, default: null })
  amount!: number | null;
}

export const StampPaperSchema = SchemaFactory.createForClass(StampPaper);

@Schema({ _id: false })
export class PaymentScheduleLine {
  @Prop({ type: Number, required: true, min: 1 })
  sequence!: number;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  amount!: number;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percent!: number | null;
}

export const PaymentScheduleLineSchema =
  SchemaFactory.createForClass(PaymentScheduleLine);

@Schema({ _id: false })
export class AgreementMilestone {
  @Prop({ required: true, trim: true })
  code!: string;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percent!: number | null;

  @Prop({ type: Number, min: 0, default: null })
  amount!: number | null;
}

export const AgreementMilestoneSchema =
  SchemaFactory.createForClass(AgreementMilestone);

@Schema({ _id: false })
export class AgreementClause {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  @Prop({ type: Number, required: true, min: 0 })
  order!: number;
}

export const AgreementClauseSchema = SchemaFactory.createForClass(AgreementClause);

@Schema({
  collection: 'sale_agreements',
  timestamps: true,
})
export class SaleAgreement {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  agreementNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  version!: number;

  @Prop({ type: Types.ObjectId, ref: 'SaleAgreement', default: null, index: true })
  rootAgreementId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'SaleAgreement', default: null, index: true })
  revisedFromId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: SaleAgreementStatus,
    required: true,
    default: SaleAgreementStatus.Draft,
    index: true,
  })
  status!: SaleAgreementStatus;

  @Prop({ type: Number, required: true, min: 0 })
  agreementValue!: number;

  @Prop({ type: StampPaperSchema, default: () => ({}) })
  stampPaper!: StampPaper;

  @Prop({ type: [PaymentScheduleLineSchema], default: [] })
  paymentScheduleSnapshot!: PaymentScheduleLine[];

  @Prop({ type: [AgreementMilestoneSchema], default: [] })
  milestones!: AgreementMilestone[];

  @Prop({ type: [AgreementClauseSchema], default: [] })
  clauses!: AgreementClause[];

  @Prop({ type: [String], default: [] })
  attachments!: string[];

  // ── Digital approval ───────────────────────────────────────────────────

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  requestedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  requestedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  executedAt!: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SaleAgreementSchema = SchemaFactory.createForClass(SaleAgreement);

SaleAgreementSchema.plugin(baseSchemaPlugin);
SaleAgreementSchema.plugin(softDeletePlugin);

SaleAgreementSchema.index({ projectId: 1, status: 1, createdAt: -1 });
SaleAgreementSchema.index({ bookingId: 1, version: -1 });
SaleAgreementSchema.index({ rootAgreementId: 1, version: -1 });
SaleAgreementSchema.index({ customerId: 1, createdAt: -1 });
