import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SiteDiaryEntryDocument = HydratedDocument<SiteDiaryEntry>;

export enum SiteDiaryEntryType {
  Meeting = 'meeting',
  Delay = 'delay',
  Visitor = 'visitor',
  Instruction = 'instruction',
  Risk = 'risk',
  Other = 'other',
}

@Schema({ _id: true })
export class SiteDiaryVisitor {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 160 })
  name!: string;

  @Prop({ type: String, trim: true, default: null, maxlength: 160 })
  organization!: string | null;

  @Prop({ type: String, trim: true, default: null, maxlength: 160 })
  purpose!: string | null;
}

export const SiteDiaryVisitorSchema =
  SchemaFactory.createForClass(SiteDiaryVisitor);

@Schema({
  collection: 'site_diary_entries',
  timestamps: true,
})
export class SiteDiaryEntry {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'DailyProgressReport',
    default: null,
    index: true,
  })
  dprId!: Types.ObjectId | null;

  @Prop({ type: Date, required: true, index: true })
  entryDate!: Date;

  @Prop({
    type: String,
    enum: SiteDiaryEntryType,
    required: true,
    index: true,
  })
  entryType!: SiteDiaryEntryType;

  @Prop({ required: true, trim: true, maxlength: 240 })
  title!: string;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({ type: [SiteDiaryVisitorSchema], default: [] })
  visitors!: SiteDiaryVisitor[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'StoredDocument' }], default: [] })
  photoDocumentIds!: Types.ObjectId[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const SiteDiaryEntrySchema =
  SchemaFactory.createForClass(SiteDiaryEntry);

SiteDiaryEntrySchema.plugin(baseSchemaPlugin);
SiteDiaryEntrySchema.plugin(softDeletePlugin);

SiteDiaryEntrySchema.index({ projectId: 1, entryDate: -1 });
SiteDiaryEntrySchema.index({ projectId: 1, siteId: 1, entryDate: -1 });
SiteDiaryEntrySchema.index({ dprId: 1, entryDate: -1 });
