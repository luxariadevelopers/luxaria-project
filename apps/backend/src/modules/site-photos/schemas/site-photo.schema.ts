import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SitePhotoDocument = HydratedDocument<SitePhoto>;

/** Domain link for geo-tagged site photos (binary stays in documents). */
export enum SitePhotoLinkType {
  Dpr = 'dpr',
  Work = 'work',
  Issue = 'issue',
  Quality = 'quality',
  Safety = 'safety',
  Diary = 'diary',
}

@Schema({
  collection: 'site_photos',
  timestamps: true,
})
export class SitePhoto {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  /** Existing StoredDocument id (S3 binary). Unique index declared below. */
  @Prop({
    type: Types.ObjectId,
    ref: 'StoredDocument',
    required: true,
  })
  documentId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: SitePhotoLinkType,
    required: true,
    index: true,
  })
  linkType!: SitePhotoLinkType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  linkId!: Types.ObjectId;

  @Prop({ type: Number, default: null })
  lat!: number | null;

  @Prop({ type: Number, default: null })
  lng!: number | null;

  @Prop({ type: Date, default: null })
  capturedAt!: Date | null;

  /** Domain version / revision for the photo attachment (not document.version). */
  @Prop({ type: Number, required: true, min: 1, default: 1 })
  version!: number;

  @Prop({ type: String, trim: true, default: null, maxlength: 500 })
  caption!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SitePhotoSchema = SchemaFactory.createForClass(SitePhoto);

SitePhotoSchema.plugin(baseSchemaPlugin);
SitePhotoSchema.plugin(softDeletePlugin);

SitePhotoSchema.index({ projectId: 1, linkType: 1, linkId: 1 });
SitePhotoSchema.index({ documentId: 1 }, { unique: true });
