import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SiteIssueDocument = HydratedDocument<SiteIssue>;

export enum SiteIssueType {
  Delay = 'delay',
  MaterialShortage = 'material_shortage',
  LabourShortage = 'labour_shortage',
  EquipmentFailure = 'equipment_failure',
  DesignClarification = 'design_clarification',
  Other = 'other',
}

export enum SiteIssueStatus {
  Open = 'open',
  Assigned = 'assigned',
  Resolved = 'resolved',
  Closed = 'closed',
}

export enum SiteIssueSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

@Schema({
  collection: 'site_issues',
  timestamps: true,
})
export class SiteIssue {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  issueNumber!: string;

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

  @Prop({
    type: String,
    enum: SiteIssueType,
    required: true,
    index: true,
  })
  type!: SiteIssueType;

  @Prop({ required: true, trim: true, maxlength: 240 })
  title!: string;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({
    type: String,
    enum: SiteIssueStatus,
    default: SiteIssueStatus.Open,
    index: true,
  })
  status!: SiteIssueStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  assigneeUserId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: SiteIssueSeverity,
    default: SiteIssueSeverity.Medium,
    index: true,
  })
  severity!: SiteIssueSeverity;

  @Prop({ type: Date, default: null })
  resolvedAt!: Date | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'StoredDocument' }], default: [] })
  photoDocumentIds!: Types.ObjectId[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const SiteIssueSchema = SchemaFactory.createForClass(SiteIssue);

SiteIssueSchema.plugin(baseSchemaPlugin);
SiteIssueSchema.plugin(softDeletePlugin);

SiteIssueSchema.index({ projectId: 1, status: 1, createdAt: -1 });
SiteIssueSchema.index({ projectId: 1, siteId: 1, status: 1 });
SiteIssueSchema.index({ dprId: 1, status: 1 });
