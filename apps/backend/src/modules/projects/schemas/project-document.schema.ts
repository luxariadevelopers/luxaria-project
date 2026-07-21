import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ProjectFileDocument = HydratedDocument<ProjectFile>;

/**
 * Document categories — Phase 2 expanded set plus legacy values kept for DB compat.
 */
export enum ProjectDocumentCategory {
  General = 'general',
  Approval = 'approval',
  Rera = 'rera',
  Contract = 'contract',
  Drawing = 'drawing',
  Photo = 'photo',
  Other = 'other',
  Drawings = 'drawings',
  Boq = 'boq',
  Contracts = 'contracts',
  GovernmentApprovals = 'government_approvals',
  LandDocuments = 'land_documents',
  StructuralDrawings = 'structural_drawings',
  CompletionCertificates = 'completion_certificates',
  Legal = 'legal',
  Images = 'images',
  Videos = 'videos',
}

@Schema({
  collection: 'project_documents',
  timestamps: true,
})
export class ProjectFile {
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
    enum: ProjectDocumentCategory,
    default: ProjectDocumentCategory.General,
    index: true,
  })
  category!: ProjectDocumentCategory;

  /** Lightweight version — increments when same category + fileName is replaced. */
  @Prop({ type: Number, default: 1, min: 1 })
  version!: number;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);

ProjectFileSchema.plugin(baseSchemaPlugin);
ProjectFileSchema.plugin(softDeletePlugin);

ProjectFileSchema.index({ projectId: 1, createdAt: -1 });
ProjectFileSchema.index({ projectId: 1, category: 1 });
ProjectFileSchema.index({ projectId: 1, category: 1, fileName: 1 });
