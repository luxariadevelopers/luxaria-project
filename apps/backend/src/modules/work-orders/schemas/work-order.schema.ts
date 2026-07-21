import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type WorkOrderDocument = HydratedDocument<WorkOrder>;

export enum WorkOrderStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Issued = 'issued',
  Accepted = 'accepted',
  InProgress = 'in_progress',
  PartiallyCompleted = 'partially_completed',
  Completed = 'completed',
  Closed = 'closed',
  Cancelled = 'cancelled',
}

export enum WorkOrderResponsibility {
  Company = 'company',
  Contractor = 'contractor',
  Shared = 'shared',
}

@Schema({ _id: true })
export class WorkOrderBoqLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', default: null })
  boqItemId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  @Prop({ type: String, trim: true, required: true })
  description!: string;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  /** quantity × rate */
  @Prop({ type: Number, required: true, min: 0 })
  value!: number;
}

export const WorkOrderBoqLineSchema =
  SchemaFactory.createForClass(WorkOrderBoqLine);

@Schema({ _id: false })
export class WorkOrderMilestone {
  @Prop({ type: String, trim: true, required: true })
  name!: string;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percentComplete!: number | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const WorkOrderMilestoneSchema =
  SchemaFactory.createForClass(WorkOrderMilestone);

@Schema({ _id: false })
export class WorkOrderPaymentTerms {
  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  advancePercent!: number | null;

  @Prop({ type: String, trim: true, default: null })
  billingCycle!: string | null;
}

export const WorkOrderPaymentTermsSchema = SchemaFactory.createForClass(
  WorkOrderPaymentTerms,
);

@Schema({ _id: false })
export class WorkOrderRetention {
  @Prop({ type: Number, required: true, min: 0, max: 100, default: 0 })
  percentage!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const WorkOrderRetentionSchema =
  SchemaFactory.createForClass(WorkOrderRetention);

@Schema({ _id: false })
export class WorkOrderRecovery {
  @Prop({ type: String, trim: true, required: true })
  type!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  amount!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const WorkOrderRecoverySchema =
  SchemaFactory.createForClass(WorkOrderRecovery);

/**
 * Frozen approved commercial snapshot. Append-only — never mutate after insert.
 */
@Schema({ _id: true })
export class WorkOrderCommercialRevision {
  _id?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  revision!: number;

  @Prop({ type: Types.ObjectId, ref: 'WorkOrderAmendment', default: null })
  amendmentId!: Types.ObjectId | null;

  @Prop({ type: [WorkOrderBoqLineSchema], default: [] })
  boqScopeLines!: WorkOrderBoqLine[];

  @Prop({ type: [String], default: [] })
  locations!: string[];

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date, required: true })
  endDate!: Date;

  @Prop({ type: [WorkOrderMilestoneSchema], default: [] })
  milestones!: WorkOrderMilestone[];

  @Prop({ type: WorkOrderPaymentTermsSchema, default: () => ({}) })
  paymentTerms!: WorkOrderPaymentTerms;

  @Prop({ type: WorkOrderRetentionSchema, default: () => ({ percentage: 0 }) })
  retention!: WorkOrderRetention;

  @Prop({ type: [WorkOrderRecoverySchema], default: [] })
  recoveries!: WorkOrderRecovery[];

  @Prop({
    type: String,
    enum: WorkOrderResponsibility,
    required: true,
  })
  materialResponsibility!: WorkOrderResponsibility;

  @Prop({
    type: String,
    enum: WorkOrderResponsibility,
    required: true,
  })
  labourResponsibility!: WorkOrderResponsibility;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Drawing' }], default: [] })
  drawingIds!: Types.ObjectId[];

  @Prop({ type: String, trim: true, default: null })
  terms!: string | null;

  @Prop({ type: [String], default: [] })
  attachments!: string[];

  @Prop({ type: Number, required: true, min: 0 })
  contractValue!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  frozenBy!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  frozenAt!: Date;
}

export const WorkOrderCommercialRevisionSchema = SchemaFactory.createForClass(
  WorkOrderCommercialRevision,
);

@Schema({
  collection: 'work_orders',
  timestamps: true,
})
export class WorkOrder {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  workOrderNumber!: string;

  /** Latest approved commercial revision number (0 until first approve). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  activeRevision!: number;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  /** Standalone rate-contract entity (Phase 6 W3) when available. */
  @Prop({ type: Types.ObjectId, ref: 'RateContract', default: null })
  rateContractId!: Types.ObjectId | null;

  /** Existing contractor agreement acting as rate contract. */
  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorAgreement',
    default: null,
  })
  agreementId!: Types.ObjectId | null;

  @Prop({ type: [WorkOrderBoqLineSchema], default: [] })
  boqScopeLines!: WorkOrderBoqLine[];

  @Prop({ type: [String], default: [] })
  locations!: string[];

  @Prop({ type: Date, required: true, index: true })
  startDate!: Date;

  @Prop({ type: Date, required: true, index: true })
  endDate!: Date;

  @Prop({ type: [WorkOrderMilestoneSchema], default: [] })
  milestones!: WorkOrderMilestone[];

  @Prop({ type: WorkOrderPaymentTermsSchema, default: () => ({}) })
  paymentTerms!: WorkOrderPaymentTerms;

  @Prop({ type: WorkOrderRetentionSchema, default: () => ({ percentage: 0 }) })
  retention!: WorkOrderRetention;

  @Prop({ type: [WorkOrderRecoverySchema], default: [] })
  recoveries!: WorkOrderRecovery[];

  @Prop({
    type: String,
    enum: WorkOrderResponsibility,
    required: true,
    default: WorkOrderResponsibility.Company,
  })
  materialResponsibility!: WorkOrderResponsibility;

  @Prop({
    type: String,
    enum: WorkOrderResponsibility,
    required: true,
    default: WorkOrderResponsibility.Contractor,
  })
  labourResponsibility!: WorkOrderResponsibility;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Drawing' }], default: [] })
  drawingIds!: Types.ObjectId[];

  @Prop({ type: String, trim: true, default: null })
  terms!: string | null;

  @Prop({ type: [String], default: [] })
  attachments!: string[];

  /** Σ BOQ line values — active commercial snapshot. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  contractValue!: number;

  /**
   * Full append-only revision history of approved commercial snapshots.
   * Entries must never be overwritten after insert.
   */
  @Prop({ type: [WorkOrderCommercialRevisionSchema], default: [] })
  revisions!: WorkOrderCommercialRevision[];

  @Prop({
    type: String,
    enum: WorkOrderStatus,
    required: true,
    default: WorkOrderStatus.Draft,
    index: true,
  })
  status!: WorkOrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  issuedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  issuedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  acceptedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  acceptedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  closedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WorkOrderSchema = SchemaFactory.createForClass(WorkOrder);

WorkOrderSchema.plugin(baseSchemaPlugin);
WorkOrderSchema.plugin(softDeletePlugin);

WorkOrderSchema.index({ projectId: 1, status: 1, createdAt: -1 });
WorkOrderSchema.index({ projectId: 1, contractorId: 1, status: 1 });
WorkOrderSchema.index({ projectId: 1, siteId: 1, status: 1 });
WorkOrderSchema.index({ agreementId: 1, status: 1 });
WorkOrderSchema.index({ rateContractId: 1, status: 1 });
