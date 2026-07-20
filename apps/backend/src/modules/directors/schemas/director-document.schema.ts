import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type DirectorFileDocument = HydratedDocument<DirectorFile>;

export enum DirectorDocumentCategory {
  General = 'general',
  Din = 'din',
  Pan = 'pan',
  Appointment = 'appointment',
  Kyc = 'kyc',
  Other = 'other',
}

@Schema({
  collection: 'director_documents',
  timestamps: true,
})
export class DirectorFile {
  @Prop({ type: Types.ObjectId, ref: 'Director', required: true, index: true })
  directorId!: Types.ObjectId;

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
    enum: DirectorDocumentCategory,
    default: DirectorDocumentCategory.General,
  })
  category!: DirectorDocumentCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  createdAt?: Date;
}

export const DirectorFileSchema = SchemaFactory.createForClass(DirectorFile);

DirectorFileSchema.plugin(baseSchemaPlugin);
DirectorFileSchema.plugin(softDeletePlugin);

DirectorFileSchema.index({ directorId: 1, createdAt: -1 });
