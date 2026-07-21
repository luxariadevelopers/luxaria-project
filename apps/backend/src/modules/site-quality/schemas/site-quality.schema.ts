import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SiteQualityDocument = HydratedDocument<SiteQuality>;

/**
 * Site workmanship QC workflow (≠ GRN vendor quality-inspections).
 * Inspection → NCR → Punch List → Rectification → Re-inspection → Closed
 */
export enum SiteQualityStatus {
  Inspection = 'inspection',
  Ncr = 'ncr',
  PunchList = 'punch_list',
  Rectification = 'rectification',
  ReInspection = 're_inspection',
  Closed = 'closed',
  Cancelled = 'cancelled',
}

export enum PunchItemStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Done = 'done',
}

@Schema({ _id: true })
export class PunchItem {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({
    type: String,
    enum: PunchItemStatus,
    default: PunchItemStatus.Open,
  })
  status!: PunchItemStatus;

  @Prop({ type: String, trim: true, default: null })
  location!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;
}

export const PunchItemSchema = SchemaFactory.createForClass(PunchItem);

@Schema({
  collection: 'site_quality',
  timestamps: true,
})
export class SiteQuality {
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

  @Prop({ type: Types.ObjectId, default: null, index: true })
  boqItemId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: String, trim: true, default: '' })
  description!: string;

  @Prop({
    type: String,
    enum: SiteQualityStatus,
    default: SiteQualityStatus.Inspection,
    index: true,
  })
  status!: SiteQualityStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'StoredDocument' }], default: [] })
  photoDocumentIds!: Types.ObjectId[];

  @Prop({ type: String, trim: true, default: null })
  findings!: string | null;

  @Prop({ type: String, trim: true, default: null, index: true })
  ncrNumber!: string | null;

  @Prop({ type: [PunchItemSchema], default: [] })
  punchItems!: PunchItem[];

  @Prop({ type: String, trim: true, default: null })
  rectificationNotes!: string | null;

  @Prop({ type: Date, default: null })
  reinspectedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  closedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;
}

export const SiteQualitySchema = SchemaFactory.createForClass(SiteQuality);

SiteQualitySchema.plugin(baseSchemaPlugin);
SiteQualitySchema.plugin(softDeletePlugin);

SiteQualitySchema.index({ projectId: 1, status: 1, createdAt: -1 });
SiteQualitySchema.index({ projectId: 1, siteId: 1, status: 1 });
SiteQualitySchema.index(
  { ncrNumber: 1 },
  {
    name: 'uniq_site_quality_ncr_number',
    unique: true,
    partialFilterExpression: {
      ncrNumber: { $type: 'string' },
      isDeleted: false,
    },
  },
);
