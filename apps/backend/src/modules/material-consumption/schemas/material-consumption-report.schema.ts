import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';
import { MaterialConsumptionAlert } from '../material-consumption.validation';

export type MaterialConsumptionReportDocument =
  HydratedDocument<MaterialConsumptionReport>;

export enum MaterialConsumptionReportStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Cancelled = 'cancelled',
}

export enum MaterialConsumptionStandardSource {
  ConsumptionStandard = 'consumption_standard',
  BoqCoefficient = 'boq_coefficient',
  None = 'none',
}

@Schema({ _id: true })
export class MaterialConsumptionLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', required: true, index: true })
  boqItemId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  baseUnit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  workQuantityCompleted!: number;

  /** Standard material qty per 1 work unit. */
  @Prop({ type: Number, required: true, min: 0 })
  coefficient!: number;

  @Prop({ type: Number, required: true, min: 0 })
  standardMaterialRequirement!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  wastagePercentage!: number;

  @Prop({ type: Number, required: true, min: 0 })
  allowedWastage!: number;

  @Prop({ type: Number, required: true, min: 0 })
  expectedConsumption!: number;

  @Prop({ type: Number, required: true, min: 0 })
  actualMaterialIssued!: number;

  @Prop({ type: Number, required: true, min: 0 })
  materialReturned!: number;

  @Prop({ type: Number, required: true })
  netActualConsumption!: number;

  @Prop({ type: Number, required: true })
  varianceQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  variancePercentage!: number;

  @Prop({ type: Number, required: true })
  varianceValue!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  standardRate!: number;

  @Prop({
    type: String,
    enum: MaterialConsumptionStandardSource,
    required: true,
    default: MaterialConsumptionStandardSource.None,
  })
  standardSource!: MaterialConsumptionStandardSource;

  @Prop({
    type: [String],
    enum: MaterialConsumptionAlert,
    default: [],
  })
  alerts!: MaterialConsumptionAlert[];

  @Prop({ type: Boolean, required: true, default: false })
  requiresApproval!: boolean;

  @Prop({ type: String, trim: true, default: null })
  explanation!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  explainedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  explainedAt!: Date | null;
}

export const MaterialConsumptionLineSchema = SchemaFactory.createForClass(
  MaterialConsumptionLine,
);

@Schema({
  collection: 'material_consumption_reports',
  timestamps: true,
})
export class MaterialConsumptionReport {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  reportNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Inclusive period start (UTC day). Null = all history. */
  @Prop({ type: Date, default: null, index: true })
  periodFrom!: Date | null;

  /** Inclusive period end (UTC day). Null = all history. */
  @Prop({ type: Date, default: null, index: true })
  periodTo!: Date | null;

  @Prop({ type: Date, required: true, index: true })
  asOfDate!: Date;

  @Prop({ type: [MaterialConsumptionLineSchema], default: [] })
  lines!: MaterialConsumptionLine[];

  @Prop({
    type: String,
    enum: MaterialConsumptionReportStatus,
    required: true,
    default: MaterialConsumptionReportStatus.Draft,
    index: true,
  })
  status!: MaterialConsumptionReportStatus;

  @Prop({ type: Boolean, required: true, default: false })
  requiresApproval!: boolean;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  approvalComment!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MaterialConsumptionReportSchema = SchemaFactory.createForClass(
  MaterialConsumptionReport,
);

MaterialConsumptionReportSchema.plugin(baseSchemaPlugin);
MaterialConsumptionReportSchema.plugin(softDeletePlugin);

MaterialConsumptionReportSchema.index({ projectId: 1, asOfDate: -1 });
MaterialConsumptionReportSchema.index({ projectId: 1, status: 1, createdAt: -1 });
MaterialConsumptionReportSchema.index({ reportNumber: 'text' });
