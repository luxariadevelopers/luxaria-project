import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ApprovalWorkflowDocument = HydratedDocument<ApprovalWorkflow>;

@Schema({ _id: false })
export class ApprovalStepConfig {
  @Prop({ type: Number, required: true, min: 1 })
  stepNumber!: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }], default: [] })
  roleIds!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  specificUserIds!: Types.ObjectId[];

  @Prop({ type: Number, default: 0, min: 0 })
  minimumAmount!: number;

  /** Null = no upper bound */
  @Prop({ type: Number, default: null, min: 0 })
  maximumAmount!: number | null;

  /** When true, every assignee in roleIds/specificUserIds must approve */
  @Prop({ type: Boolean, default: false })
  requiresAll!: boolean;

  @Prop({ type: Number, default: null, min: 1 })
  escalationHours!: number | null;

  @Prop({ type: Types.ObjectId, ref: 'Role', default: null })
  fallbackRole!: Types.ObjectId | null;
}

export const ApprovalStepConfigSchema =
  SchemaFactory.createForClass(ApprovalStepConfig);

@Schema({
  collection: 'approval_workflows',
  timestamps: true,
})
export class ApprovalWorkflow {
  @Prop({ required: true, trim: true, lowercase: true, index: true })
  module!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  entityType!: string;

  @Prop({ type: String, trim: true, default: null })
  name!: string | null;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  /**
   * When false (default), requester cannot approve their own request.
   */
  @Prop({ type: Boolean, default: false })
  allowSelfApprove!: boolean;

  @Prop({ type: [ApprovalStepConfigSchema], default: [] })
  steps!: ApprovalStepConfig[];
}

export const ApprovalWorkflowSchema =
  SchemaFactory.createForClass(ApprovalWorkflow);

ApprovalWorkflowSchema.plugin(baseSchemaPlugin);
ApprovalWorkflowSchema.plugin(softDeletePlugin);

ApprovalWorkflowSchema.index(
  { module: 1, entityType: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true, isDeleted: false },
  },
);
