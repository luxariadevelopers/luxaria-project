import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ApprovalRequestDocument = HydratedDocument<ApprovalRequest>;

export enum ApprovalStatus {
  Draft = 'draft',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
  Returned = 'returned',
}

/**
 * Embedded timeline snapshot — append-only via $push.
 * Canonical immutable log lives in `approval_history`.
 */
@Schema({ _id: false })
export class ApprovalHistorySnapshot {
  @Prop({ type: Types.ObjectId, required: true })
  historyId!: Types.ObjectId;

  @Prop({ type: Number, required: true })
  stepNumber!: number;

  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  comment!: string | null;

  @Prop({ type: Date, required: true })
  at!: Date;
}

export const ApprovalHistorySnapshotSchema = SchemaFactory.createForClass(
  ApprovalHistorySnapshot,
);

@Schema({
  collection: 'approval_requests',
  timestamps: true,
})
export class ApprovalRequest {
  @Prop({ required: true, unique: true, trim: true, index: true })
  approvalCode!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  module!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  entityType!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalWorkflow', required: true })
  workflowId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  requestedAt!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  currentStep!: number;

  @Prop({
    type: String,
    enum: ApprovalStatus,
    default: ApprovalStatus.Draft,
    index: true,
  })
  status!: ApprovalStatus;

  @Prop({ type: String, trim: true, default: null })
  reason!: string | null;

  /** When the current step became active (for escalation) */
  @Prop({ type: Date, default: null })
  stepEnteredAt!: Date | null;

  /** After escalate, current step may accept fallbackRole */
  @Prop({ type: Boolean, default: false })
  escalated!: boolean;

  @Prop({ type: [ApprovalHistorySnapshotSchema], default: [] })
  approvalHistory!: ApprovalHistorySnapshot[];
}

export const ApprovalRequestSchema =
  SchemaFactory.createForClass(ApprovalRequest);

ApprovalRequestSchema.plugin(baseSchemaPlugin);
ApprovalRequestSchema.plugin(softDeletePlugin);

ApprovalRequestSchema.index({ projectId: 1, status: 1, createdAt: -1 });
ApprovalRequestSchema.index({ module: 1, entityType: 1, entityId: 1 });
ApprovalRequestSchema.index(
  { module: 1, entityType: 1, entityId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [ApprovalStatus.Draft, ApprovalStatus.Pending, ApprovalStatus.Returned] },
      isDeleted: false,
    },
  },
);
