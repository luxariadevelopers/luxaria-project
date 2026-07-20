import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type QualityInspectionDocument = HydratedDocument<QualityInspection>;

export enum QualityInspectionStatus {
  Draft = 'draft',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum QualityInspectionResult {
  Accepted = 'accepted',
  PartiallyAccepted = 'partially_accepted',
  Rejected = 'rejected',
  Hold = 'hold',
}

@Schema({ _id: false })
export class QualityTestParameter {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, default: null })
  expectedValue!: string | null;

  @Prop({ type: String, trim: true, default: null })
  actualValue!: string | null;

  @Prop({ type: String, trim: true, default: null })
  unit!: string | null;

  @Prop({ type: Boolean, default: null })
  passed!: boolean | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const QualityTestParameterSchema =
  SchemaFactory.createForClass(QualityTestParameter);

@Schema({ _id: true })
export class QualityInspectionLine {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  grnLineId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  receivedQuantity!: number;

  @Prop({ type: Number, min: 0, default: null })
  acceptedQuantity!: number | null;

  @Prop({ type: Number, min: 0, default: null })
  rejectedQuantity!: number | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;
}

export const QualityInspectionLineSchema =
  SchemaFactory.createForClass(QualityInspectionLine);

@Schema({
  collection: 'quality_inspections',
  timestamps: true,
})
export class QualityInspection {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  inspectionNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'GoodsReceipt',
    required: true,
    index: true,
  })
  grnId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  inspector!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  inspectionDate!: Date;

  @Prop({ type: [QualityTestParameterSchema], default: [] })
  testParameters!: QualityTestParameter[];

  @Prop({ type: [QualityInspectionLineSchema], default: [] })
  items!: QualityInspectionLine[];

  @Prop({ type: [String], default: [] })
  samplePhotos!: string[];

  @Prop({ type: [String], default: [] })
  testDocuments!: string[];

  @Prop({
    type: String,
    enum: QualityInspectionResult,
    default: null,
  })
  result!: QualityInspectionResult | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  @Prop({
    type: String,
    enum: QualityInspectionStatus,
    default: QualityInspectionStatus.Draft,
    index: true,
  })
  status!: QualityInspectionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  completedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const QualityInspectionSchema =
  SchemaFactory.createForClass(QualityInspection);

QualityInspectionSchema.plugin(baseSchemaPlugin);
QualityInspectionSchema.plugin(softDeletePlugin);

QualityInspectionSchema.index({ projectId: 1, status: 1, inspectionDate: -1 });
QualityInspectionSchema.index({ vendorId: 1, result: 1, completedAt: -1 });
QualityInspectionSchema.index({
  inspectionNumber: 'text',
  remarks: 'text',
});
