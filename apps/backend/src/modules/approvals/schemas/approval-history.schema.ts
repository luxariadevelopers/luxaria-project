import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type ApprovalHistoryDocument = HydratedDocument<ApprovalHistory>;

export enum ApprovalHistoryAction {
  Submitted = 'submitted',
  Approved = 'approved',
  Rejected = 'rejected',
  Returned = 'returned',
  Cancelled = 'cancelled',
  Escalated = 'escalated',
}

/**
 * Immutable approval audit log — insert only.
 * Never update or soft-delete these rows.
 */
@Schema({
  collection: 'approval_history',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class ApprovalHistory {
  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', required: true, index: true })
  approvalRequestId!: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  approvalCode!: string;

  @Prop({ type: Number, required: true, min: 0 })
  stepNumber!: number;

  @Prop({
    type: String,
    enum: ApprovalHistoryAction,
    required: true,
    index: true,
  })
  action!: ApprovalHistoryAction;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  actorId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  comment!: string | null;

  @Prop({ type: Object, default: null })
  metadata!: Record<string, unknown> | null;

  @Prop({ type: Date, required: true, index: true })
  at!: Date;
}

export const ApprovalHistorySchema =
  SchemaFactory.createForClass(ApprovalHistory);

ApprovalHistorySchema.index({ approvalRequestId: 1, at: 1, _id: 1 });

/** Block updates/deletes at the schema level */
ApprovalHistorySchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'] as any,
  function () {
    throw new Error('Approval history is immutable and cannot be updated');
  },
);

ApprovalHistorySchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete'] as any,
  function () {
    throw new Error('Approval history is immutable and cannot be deleted');
  },
);
