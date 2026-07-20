import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type DailyProgressReportDocument =
  HydratedDocument<DailyProgressReport>;

export enum DprStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Reviewed = 'reviewed',
  Reopened = 'reopened',
}

export enum DprWeather {
  Clear = 'clear',
  Cloudy = 'cloudy',
  Rain = 'rain',
  Storm = 'storm',
  Hot = 'hot',
  Fog = 'fog',
  Other = 'other',
}

export enum DprIssueSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

@Schema({ _id: true })
export class DprStaffPresent {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, default: null })
  role!: string | null;

  @Prop({ type: Boolean, default: true })
  present!: boolean;
}

export const DprStaffPresentSchema =
  SchemaFactory.createForClass(DprStaffPresent);

@Schema({ _id: true })
export class DprBoqQuantity {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', required: true })
  boqItemId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  description!: string | null;

  @Prop({ type: String, trim: true, default: null })
  unit!: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  quantityCompleted!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const DprBoqQuantitySchema =
  SchemaFactory.createForClass(DprBoqQuantity);

@Schema({ _id: true })
export class DprMaterialLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', default: null })
  materialId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  materialName!: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: String, trim: true, default: null })
  unit!: string | null;

  @Prop({ type: String, trim: true, default: null })
  reference!: string | null;
}

export const DprMaterialLineSchema =
  SchemaFactory.createForClass(DprMaterialLine);

@Schema({ _id: true })
export class DprEquipmentUsed {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  hours!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const DprEquipmentUsedSchema =
  SchemaFactory.createForClass(DprEquipmentUsed);

@Schema({ _id: true })
export class DprDelay {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  hoursLost!: number;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const DprDelaySchema = SchemaFactory.createForClass(DprDelay);

@Schema({ _id: true })
export class DprIssue {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({
    type: String,
    enum: DprIssueSeverity,
    default: DprIssueSeverity.Medium,
  })
  severity!: DprIssueSeverity;

  @Prop({ type: String, trim: true, default: null })
  actionTaken!: string | null;
}

export const DprIssueSchema = SchemaFactory.createForClass(DprIssue);

@Schema({ _id: true })
export class DprDecisionRequired {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: String, trim: true, default: null })
  owner!: string | null;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;
}

export const DprDecisionRequiredSchema =
  SchemaFactory.createForClass(DprDecisionRequired);

@Schema({
  collection: 'daily_progress_reports',
  timestamps: true,
})
export class DailyProgressReport {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  dprNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Calendar date of the report (UTC midnight normalized). */
  @Prop({ type: Date, required: true, index: true })
  reportDate!: Date;

  @Prop({
    type: String,
    enum: DprWeather,
    required: true,
    default: DprWeather.Clear,
  })
  weather!: DprWeather;

  @Prop({ type: String, trim: true, default: null })
  weatherNotes!: string | null;

  @Prop({ type: [DprStaffPresentSchema], default: [] })
  staffPresent!: DprStaffPresent[];

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  labourCount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  skilledLabourCount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  unskilledLabourCount!: number;

  @Prop({ type: String, trim: true, default: null })
  workPerformed!: string | null;

  @Prop({ type: [DprBoqQuantitySchema], default: [] })
  boqQuantities!: DprBoqQuantity[];

  @Prop({ type: [DprMaterialLineSchema], default: [] })
  materialsReceived!: DprMaterialLine[];

  @Prop({ type: [DprMaterialLineSchema], default: [] })
  materialsIssued!: DprMaterialLine[];

  @Prop({ type: [DprEquipmentUsedSchema], default: [] })
  equipmentUsed!: DprEquipmentUsed[];

  @Prop({ type: [DprDelaySchema], default: [] })
  delays!: DprDelay[];

  @Prop({ type: [DprIssueSchema], default: [] })
  safetyIssues!: DprIssue[];

  @Prop({ type: [DprIssueSchema], default: [] })
  qualityIssues!: DprIssue[];

  @Prop({ type: [DprDecisionRequiredSchema], default: [] })
  decisionsRequired!: DprDecisionRequired[];

  @Prop({ type: String, trim: true, default: null })
  tomorrowPlan!: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  photoDocumentIds!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  videoDocumentIds!: Types.ObjectId[];

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  siteCashBalance!: number;

  @Prop({ type: Types.ObjectId, ref: 'CashAccount', default: null })
  siteCashAccountId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: DprStatus,
    required: true,
    default: DprStatus.Draft,
    index: true,
  })
  status!: DprStatus;

  @Prop({ type: Types.ObjectId, ref: 'Document', default: null })
  pdfDocumentId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  @Prop({ type: String, trim: true, default: null })
  clientDeviceId!: string | null;

  @Prop({ type: Date, default: null })
  offlineCapturedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  reviewNotes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reopenedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reopenedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  reopenReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DailyProgressReportSchema = SchemaFactory.createForClass(
  DailyProgressReport,
);

DailyProgressReportSchema.plugin(baseSchemaPlugin);
DailyProgressReportSchema.plugin(softDeletePlugin);

DailyProgressReportSchema.index(
  { projectId: 1, reportDate: 1 },
  { unique: true, name: 'uniq_dpr_project_date' },
);
DailyProgressReportSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
    name: 'uniq_dpr_idempotency_key',
  },
);
DailyProgressReportSchema.index({ projectId: 1, status: 1, reportDate: -1 });

@Schema({
  collection: 'dpr_missing_alerts',
  timestamps: true,
})
export class DprMissingAlert {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  reportDate!: Date;

  @Prop({ type: String, trim: true, required: true })
  message!: string;

  @Prop({ type: Boolean, default: false, index: true })
  acknowledged!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  acknowledgedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  acknowledgedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type DprMissingAlertDocument = HydratedDocument<DprMissingAlert>;

export const DprMissingAlertSchema =
  SchemaFactory.createForClass(DprMissingAlert);

DprMissingAlertSchema.plugin(baseSchemaPlugin);
DprMissingAlertSchema.plugin(softDeletePlugin);
DprMissingAlertSchema.index(
  { projectId: 1, reportDate: 1 },
  { unique: true, name: 'uniq_dpr_missing_alert' },
);
