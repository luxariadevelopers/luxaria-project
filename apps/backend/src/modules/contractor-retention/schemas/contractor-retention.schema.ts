import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContractorRetentionDocument = HydratedDocument<ContractorRetention>;

/** Deduction holds retention from a posted RA bill; release returns held funds. */
export enum RetentionKind {
  Deduction = 'deduction',
  Release = 'release',
}

/**
 * Release milestone stages.
 * Today bills only **hold** retention (credit Retention Payable on post);
 * staged release is managed here.
 */
export enum RetentionReleaseStage {
  PracticalCompletion = 'practical_completion',
  DefectLiability = 'defect_liability',
  BgReplacement = 'bg_replacement',
}

export enum RetentionStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Released = 'released',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'contractor_retentions',
  timestamps: true,
})
export class ContractorRetention {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  retentionNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Contractor',
    required: true,
    index: true,
  })
  contractorId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorAgreement',
    default: null,
    index: true,
  })
  agreementId!: Types.ObjectId | null;

  /** Source RA bill for deductions (and optional link on releases). */
  @Prop({
    type: Types.ObjectId,
    ref: 'ContractorBill',
    default: null,
    index: true,
  })
  billId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: RetentionKind,
    required: true,
    index: true,
  })
  kind!: RetentionKind;

  /**
   * Max retention that may be held for this contractor+project(+agreement).
   * Enforced across approved deductions vs released amounts.
   */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  ceilingAmount!: number;

  /** Amount withheld (kind=deduction) or proposed/released (kind=release). */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({
    type: String,
    enum: RetentionReleaseStage,
    default: null,
    index: true,
  })
  releaseStage!: RetentionReleaseStage | null;

  /** Bank guarantee / BG document reference when stage = bg_replacement. */
  @Prop({ type: String, trim: true, default: null })
  bgReference!: string | null;

  @Prop({
    type: String,
    enum: RetentionStatus,
    required: true,
    default: RetentionStatus.Draft,
    index: true,
  })
  status!: RetentionStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  // ── Approval workflow ──────────────────────────────────────────────────

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

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  releasedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  releasedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractorRetentionSchema =
  SchemaFactory.createForClass(ContractorRetention);

ContractorRetentionSchema.plugin(baseSchemaPlugin);
ContractorRetentionSchema.plugin(softDeletePlugin);

ContractorRetentionSchema.index({
  projectId: 1,
  contractorId: 1,
  status: 1,
  createdAt: -1,
});
ContractorRetentionSchema.index({
  projectId: 1,
  contractorId: 1,
  agreementId: 1,
  kind: 1,
});
ContractorRetentionSchema.index({ billId: 1, kind: 1 });
