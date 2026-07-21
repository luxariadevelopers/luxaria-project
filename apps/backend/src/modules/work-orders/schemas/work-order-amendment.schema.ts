import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  WorkOrderBoqLine,
  WorkOrderBoqLineSchema,
  WorkOrderMilestone,
  WorkOrderMilestoneSchema,
  WorkOrderPaymentTerms,
  WorkOrderPaymentTermsSchema,
  WorkOrderRecovery,
  WorkOrderRecoverySchema,
  WorkOrderResponsibility,
  WorkOrderRetention,
  WorkOrderRetentionSchema,
} from './work-order.schema';

export type WorkOrderAmendmentDocument = HydratedDocument<WorkOrderAmendment>;

export enum WorkOrderAmendmentType {
  Quantity = 'quantity',
  Rate = 'rate',
  Scope = 'scope',
  TimeExtension = 'time_extension',
  RevisedValue = 'revised_value',
  Mixed = 'mixed',
}

export enum WorkOrderAmendmentStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

/**
 * Proposed commercial payload for an amendment.
 * On approval this becomes a new frozen WorkOrderCommercialRevision —
 * prior approved snapshots are never overwritten.
 */
@Schema({ _id: false })
export class WorkOrderAmendmentProposed {
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
}

export const WorkOrderAmendmentProposedSchema = SchemaFactory.createForClass(
  WorkOrderAmendmentProposed,
);

@Schema({
  collection: 'work_order_amendments',
  timestamps: true,
})
export class WorkOrderAmendment {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  amendmentNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'WorkOrder',
    required: true,
    index: true,
  })
  workOrderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Revision number that will be assigned on approval. */
  @Prop({ type: Number, required: true, min: 2 })
  targetRevision!: number;

  @Prop({
    type: String,
    enum: WorkOrderAmendmentType,
    required: true,
    index: true,
  })
  type!: WorkOrderAmendmentType;

  @Prop({
    type: String,
    enum: WorkOrderAmendmentStatus,
    required: true,
    default: WorkOrderAmendmentStatus.Draft,
    index: true,
  })
  status!: WorkOrderAmendmentStatus;

  @Prop({ type: String, trim: true, required: true })
  reason!: string;

  @Prop({ type: WorkOrderAmendmentProposedSchema, required: true })
  proposed!: WorkOrderAmendmentProposed;

  /** Base revision active when amendment was created (immutable audit). */
  @Prop({ type: Number, required: true, min: 1 })
  baseRevision!: number;

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
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WorkOrderAmendmentSchema =
  SchemaFactory.createForClass(WorkOrderAmendment);

WorkOrderAmendmentSchema.plugin(baseSchemaPlugin);
WorkOrderAmendmentSchema.plugin(softDeletePlugin);

WorkOrderAmendmentSchema.index({ workOrderId: 1, status: 1, createdAt: -1 });
WorkOrderAmendmentSchema.index({ projectId: 1, status: 1, createdAt: -1 });
WorkOrderAmendmentSchema.index(
  { workOrderId: 1, targetRevision: 1 },
  { unique: true },
);
