import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type SiteSafetyDocument = HydratedDocument<SiteSafety>;

export enum SiteSafetyType {
  NearMiss = 'near_miss',
  Accident = 'accident',
  Ppe = 'ppe',
  ToolboxTalk = 'toolbox_talk',
  SafetyInspection = 'safety_inspection',
}

export enum SiteSafetySeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export enum SiteSafetyStatus {
  Open = 'open',
  Investigating = 'investigating',
  Closed = 'closed',
}

@Schema({ _id: false })
export class PpeChecklistItem {
  @Prop({ required: true, trim: true })
  item!: string;

  @Prop({ type: Boolean, default: false })
  compliant!: boolean;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const PpeChecklistItemSchema =
  SchemaFactory.createForClass(PpeChecklistItem);

@Schema({ _id: false })
export class SafetyAttendee {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, default: null })
  role!: string | null;
}

export const SafetyAttendeeSchema =
  SchemaFactory.createForClass(SafetyAttendee);

@Schema({
  collection: 'site_safety',
  timestamps: true,
})
export class SiteSafety {
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
    enum: SiteSafetyType,
    required: true,
    index: true,
  })
  type!: SiteSafetyType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: String, trim: true, default: '' })
  description!: string;

  @Prop({
    type: String,
    enum: SiteSafetySeverity,
    default: SiteSafetySeverity.Medium,
    index: true,
  })
  severity!: SiteSafetySeverity;

  @Prop({
    type: String,
    enum: SiteSafetyStatus,
    default: SiteSafetyStatus.Open,
    index: true,
  })
  status!: SiteSafetyStatus;

  /** PPE check items when type = ppe */
  @Prop({ type: [PpeChecklistItemSchema], default: null })
  ppeChecklist!: PpeChecklistItem[] | null;

  /** Toolbox talk attendees when type = toolbox_talk */
  @Prop({ type: [SafetyAttendeeSchema], default: [] })
  attendees!: SafetyAttendee[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'StoredDocument' }], default: [] })
  photoDocumentIds!: Types.ObjectId[];

  @Prop({ type: String, trim: true, default: null })
  investigationNotes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  closedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;
}

export const SiteSafetySchema = SchemaFactory.createForClass(SiteSafety);

SiteSafetySchema.plugin(baseSchemaPlugin);
SiteSafetySchema.plugin(softDeletePlugin);

SiteSafetySchema.index({ projectId: 1, status: 1, createdAt: -1 });
SiteSafetySchema.index({ projectId: 1, type: 1, status: 1 });
SiteSafetySchema.index({ projectId: 1, siteId: 1, severity: 1 });
