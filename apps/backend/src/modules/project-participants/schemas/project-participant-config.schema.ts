import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ProjectParticipantConfigDocument =
  HydratedDocument<ProjectParticipantConfig>;

/**
 * Tracks whether project profit-share configuration is finalised.
 * Finalised ⇒ active approved profit shares must total 100%.
 * Independent of company equity shareholding.
 */
@Schema({
  collection: 'project_participant_configs',
  timestamps: true,
})
export class ProjectParticipantConfig {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, unique: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Boolean, default: false, index: true })
  isFinalised!: boolean;

  @Prop({ type: Date, default: null })
  finalisedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  finalisedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  unfinalisedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  unfinalisedBy!: Types.ObjectId | null;
}

export const ProjectParticipantConfigSchema = SchemaFactory.createForClass(
  ProjectParticipantConfig,
);

ProjectParticipantConfigSchema.plugin(baseSchemaPlugin);
ProjectParticipantConfigSchema.plugin(softDeletePlugin);
