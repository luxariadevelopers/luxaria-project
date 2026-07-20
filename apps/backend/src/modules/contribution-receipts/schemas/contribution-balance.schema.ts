import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ProjectContributionBalanceDocument =
  HydratedDocument<ProjectContributionBalance>;

export type ParticipantContributionBalanceDocument =
  HydratedDocument<ParticipantContributionBalance>;

@Schema({
  collection: 'project_contribution_balances',
  timestamps: true,
})
export class ProjectContributionBalance {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, unique: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Number, default: 0, min: 0 })
  receivedAmount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  postedReceiptCount!: number;

  @Prop({ type: Date, default: null })
  lastReceiptAt!: Date | null;
}

export const ProjectContributionBalanceSchema = SchemaFactory.createForClass(
  ProjectContributionBalance,
);

ProjectContributionBalanceSchema.plugin(baseSchemaPlugin);
ProjectContributionBalanceSchema.plugin(softDeletePlugin);

@Schema({
  collection: 'participant_contribution_balances',
  timestamps: true,
})
export class ParticipantContributionBalance {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectParticipant',
    required: true,
    index: true,
  })
  participantId!: Types.ObjectId;

  @Prop({ type: Number, default: 0, min: 0 })
  receivedAmount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  postedReceiptCount!: number;

  @Prop({ type: Date, default: null })
  lastReceiptAt!: Date | null;
}

export const ParticipantContributionBalanceSchema = SchemaFactory.createForClass(
  ParticipantContributionBalance,
);

ParticipantContributionBalanceSchema.plugin(baseSchemaPlugin);
ParticipantContributionBalanceSchema.plugin(softDeletePlugin);

ParticipantContributionBalanceSchema.index(
  { projectId: 1, participantId: 1 },
  { unique: true },
);
