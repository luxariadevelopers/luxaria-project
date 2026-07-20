import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ProjectParticipantFileDocument =
  HydratedDocument<ProjectParticipantFile>;

export enum ParticipantDocumentCategory {
  Agreement = 'agreement',
  Amendment = 'amendment',
  BoardResolution = 'board_resolution',
  Other = 'other',
}

@Schema({
  collection: 'project_participant_documents',
  timestamps: true,
})
export class ProjectParticipantFile {
  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectParticipant',
    required: true,
    index: true,
  })
  participantRecordId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, trim: true, default: null })
  mimeType!: string | null;

  @Prop({ type: Number, default: 0, min: 0 })
  sizeBytes!: number;

  @Prop({
    type: String,
    enum: ParticipantDocumentCategory,
    default: ParticipantDocumentCategory.Agreement,
  })
  category!: ParticipantDocumentCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  createdAt?: Date;
}

export const ProjectParticipantFileSchema = SchemaFactory.createForClass(
  ProjectParticipantFile,
);

ProjectParticipantFileSchema.plugin(baseSchemaPlugin);
ProjectParticipantFileSchema.plugin(softDeletePlugin);

ProjectParticipantFileSchema.index({ participantRecordId: 1, createdAt: -1 });
