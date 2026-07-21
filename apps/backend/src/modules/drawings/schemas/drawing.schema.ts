import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type DrawingDocument = HydratedDocument<Drawing>;

export enum DrawingStatus {
  Draft = 'draft',
  Issued = 'issued',
  Superseded = 'superseded',
  Archived = 'archived',
}

@Schema({
  collection: 'drawings',
  timestamps: true,
})
export class Drawing {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Optional site scope — enforced via SiteAccessService when set */
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true, uppercase: true, index: true })
  drawingNumber!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: String, trim: true, default: null })
  discipline!: string | null;

  /** Revision label, e.g. "0", "A", "Rev-1" */
  @Prop({ required: true, trim: true })
  revision!: string;

  @Prop({ type: Boolean, default: true, index: true })
  isLatest!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Drawing', default: null, index: true })
  supersededById!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: DrawingStatus,
    default: DrawingStatus.Draft,
    index: true,
  })
  status!: DrawingStatus;

  /** Primary drawing file (documents module) */
  @Prop({ type: Types.ObjectId, ref: 'StoredDocument', required: true })
  documentId!: Types.ObjectId;

  /** Markup / overlay document ids */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'StoredDocument' }], default: [] })
  markupDocumentIds!: Types.ObjectId[];

  @Prop({ type: Date, default: null })
  issuedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const DrawingSchema = SchemaFactory.createForClass(Drawing);

DrawingSchema.plugin(baseSchemaPlugin);
DrawingSchema.plugin(softDeletePlugin);

DrawingSchema.index({ projectId: 1, drawingNumber: 1, revision: 1 });
DrawingSchema.index({ projectId: 1, siteId: 1, isLatest: 1, status: 1 });
DrawingSchema.index({ projectId: 1, isLatest: 1, drawingNumber: 1 });
