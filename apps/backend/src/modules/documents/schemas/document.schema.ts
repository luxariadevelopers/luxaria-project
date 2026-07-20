import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type StoredDocumentDocument = HydratedDocument<StoredDocument>;

export enum DocumentStatus {
  PendingUpload = 'pending_upload',
  Active = 'active',
  Replaced = 'replaced',
  Archived = 'archived',
}

export enum MalwareScanStatus {
  Pending = 'pending',
  Clean = 'clean',
  Infected = 'infected',
  Skipped = 'skipped',
  Error = 'error',
}

/**
 * Reusable private S3 document metadata.
 * Objects are never made public — access only via short-lived presigned URLs.
 */
@Schema({
  collection: 'documents',
  timestamps: true,
})
export class StoredDocument {
  /** Shared across versions of the same logical document */
  @Prop({ required: true, trim: true, uppercase: true, index: true })
  documentCode!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', default: null, index: true })
  companyId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null, index: true })
  projectId!: Types.ObjectId | null;

  /** Logical module, e.g. investors, contribution_receipts */
  @Prop({ required: true, trim: true, lowercase: true, index: true })
  module!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  entityType!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId!: Types.ObjectId;

  /** Server-generated storage file name (MIME-derived extension) */
  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true, trim: true })
  originalFileName!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  mimeType!: string;

  @Prop({ type: Number, required: true, min: 0 })
  size!: number;

  /** Hex SHA-256 checksum */
  @Prop({ type: String, trim: true, lowercase: true, default: null })
  checksum!: string | null;

  /** Private bucket object key — never expose as a public URL */
  @Prop({ required: true, trim: true, unique: true })
  s3Key!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploadedBy!: Types.ObjectId;

  @Prop({ type: Date, default: null })
  uploadedAt!: Date | null;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  documentType!: string;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  version!: number;

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.PendingUpload,
    index: true,
  })
  status!: DocumentStatus;

  @Prop({
    type: String,
    enum: MalwareScanStatus,
    default: MalwareScanStatus.Pending,
    index: true,
  })
  malwareScanStatus!: MalwareScanStatus;

  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', default: null })
  previousVersionId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  replaceGroupKey!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StoredDocumentSchema = SchemaFactory.createForClass(StoredDocument);

StoredDocumentSchema.plugin(baseSchemaPlugin);
StoredDocumentSchema.plugin(softDeletePlugin);

StoredDocumentSchema.index(
  { documentCode: 1, version: 1 },
  { unique: true },
);
StoredDocumentSchema.index({
  entityType: 1,
  entityId: 1,
  status: 1,
  version: -1,
});
StoredDocumentSchema.index({ module: 1, entityType: 1, entityId: 1 });
StoredDocumentSchema.index({ projectId: 1, module: 1, status: 1 });
StoredDocumentSchema.index({ replaceGroupKey: 1, version: -1 });
