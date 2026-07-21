import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { BoqUnit } from '../../boq/schemas/boq.schema';

export type WorkMeasurementDocument = HydratedDocument<WorkMeasurement>;

export enum WorkMeasurementStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Verified = 'verified',
  /** Engineer-approved / certified — drives BOQ progressQuantity. */
  Certified = 'certified',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'work_measurements',
  timestamps: true,
})
export class WorkMeasurement {
  @Prop({ required: true, trim: true, uppercase: true, unique: true })
  measurementNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Optional site scope (SE hierarchy). */
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  /** Optional link to the daily progress report that owns this measurement. */
  @Prop({
    type: Types.ObjectId,
    ref: 'DailyProgressReport',
    default: null,
    index: true,
  })
  dprId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Contractor', required: true, index: true })
  contractorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BoqItem', required: true, index: true })
  boqItemId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  boqCode!: string | null;

  @Prop({ type: String, trim: true, required: true })
  location!: string;

  /** Measurement sheet / MB reference (e.g. MB-12 / Sheet 3). */
  @Prop({ type: String, trim: true, default: null })
  sheetReference!: string | null;

  /** Free-text description of work measured on the sheet. */
  @Prop({ type: String, trim: true, default: null })
  workDescription!: string | null;

  @Prop({ type: Date, required: true, index: true })
  measurementDate!: Date;

  /** Sum of prior submitted/verified current quantities for same project+BOQ+contractor. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  previousQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  currentQuantity!: number;

  /** previousQuantity + currentQuantity */
  @Prop({ type: Number, required: true, min: 0 })
  cumulativeQuantity!: number;

  @Prop({ type: String, enum: BoqUnit, required: true })
  unit!: BoqUnit;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  measuredBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  certifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  certifiedAt!: Date | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  photoDocumentIds!: Types.ObjectId[];

  /** Legacy / free-text drawing ref (kept for PDF and offline). */
  @Prop({ type: String, trim: true, default: null })
  drawingReference!: string | null;

  /** Future drawing register link (nullable until W8 register is wired). */
  @Prop({ type: Types.ObjectId, ref: 'Drawing', default: null, index: true })
  drawingId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: WorkMeasurementStatus,
    required: true,
    default: WorkMeasurementStatus.Draft,
    index: true,
  })
  status!: WorkMeasurementStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  rejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  /** BOQ planned quantity snapshot at create/update (active version). */
  @Prop({ type: Number, required: true, min: 0 })
  boqPlannedQuantity!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WorkMeasurementSchema =
  SchemaFactory.createForClass(WorkMeasurement);
WorkMeasurementSchema.plugin(baseSchemaPlugin);
WorkMeasurementSchema.plugin(softDeletePlugin);
WorkMeasurementSchema.index({ projectId: 1, measurementDate: -1 });
WorkMeasurementSchema.index({ projectId: 1, boqItemId: 1, status: 1 });
WorkMeasurementSchema.index({ contractorId: 1, status: 1 });
WorkMeasurementSchema.index({ dprId: 1, status: 1 });
WorkMeasurementSchema.index({ projectId: 1, siteId: 1, measurementDate: -1 });
