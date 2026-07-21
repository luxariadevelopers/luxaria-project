import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type UnitHandoverDocument = HydratedDocument<UnitHandover>;

export enum UnitHandoverStatus {
  Draft = 'draft',
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum SnagStatus {
  Open = 'open',
  Closed = 'closed',
}

@Schema({ _id: true })
export class SnagItem {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @Prop({
    type: String,
    enum: SnagStatus,
    required: true,
    default: SnagStatus.Open,
  })
  status!: SnagStatus;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const SnagItemSchema = SchemaFactory.createForClass(SnagItem);

@Schema({ _id: true })
export class MeterReading {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  utility!: string;

  @Prop({ type: Number, required: true, min: 0 })
  reading!: number;

  @Prop({ type: String, trim: true, default: null })
  unit!: string | null;
}

export const MeterReadingSchema = SchemaFactory.createForClass(MeterReading);

@Schema({ _id: true })
export class WarrantyDocument {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: true, trim: true })
  filePath!: string;
}

export const WarrantyDocumentSchema =
  SchemaFactory.createForClass(WarrantyDocument);

@Schema({ _id: true })
export class AssetRegisterItem {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true, default: null })
  serial!: string | null;

  @Prop({ type: String, trim: true, default: null })
  condition!: string | null;
}

export const AssetRegisterItemSchema =
  SchemaFactory.createForClass(AssetRegisterItem);

@Schema({ _id: true })
export class HandoverPhoto {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, trim: true, default: null })
  caption!: string | null;

  @Prop({ type: Date, default: null })
  takenAt!: Date | null;
}

export const HandoverPhotoSchema = SchemaFactory.createForClass(HandoverPhoto);

@Schema({
  collection: 'unit_handovers',
  timestamps: true,
})
export class UnitHandover {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  handoverNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: UnitHandoverStatus,
    required: true,
    default: UnitHandoverStatus.Draft,
    index: true,
  })
  status!: UnitHandoverStatus;

  @Prop({ type: Date, default: null })
  scheduledAt!: Date | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: [SnagItemSchema], default: [] })
  snagList!: SnagItem[];

  @Prop({ type: Boolean, required: true, default: false })
  keysHandedOver!: boolean;

  @Prop({ type: [MeterReadingSchema], default: [] })
  meterReadings!: MeterReading[];

  @Prop({ type: [WarrantyDocumentSchema], default: [] })
  warrantyDocuments!: WarrantyDocument[];

  @Prop({ type: String, trim: true, default: null })
  maintenanceNotes!: string | null;

  @Prop({ type: [AssetRegisterItemSchema], default: [] })
  assetRegister!: AssetRegisterItem[];

  @Prop({ type: Boolean, required: true, default: false })
  customerAcknowledged!: boolean;

  @Prop({ type: Date, default: null })
  acknowledgedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  acknowledgedByName!: string | null;

  @Prop({ type: [HandoverPhotoSchema], default: [] })
  photos!: HandoverPhoto[];

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UnitHandoverSchema = SchemaFactory.createForClass(UnitHandover);

UnitHandoverSchema.plugin(baseSchemaPlugin);
UnitHandoverSchema.plugin(softDeletePlugin);

UnitHandoverSchema.index({ projectId: 1, status: 1, createdAt: -1 });
UnitHandoverSchema.index({ bookingId: 1, status: 1 });
UnitHandoverSchema.index({ unitId: 1, status: 1 });
