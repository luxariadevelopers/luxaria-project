import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type StockReservationDocument = HydratedDocument<StockReservation>;

export enum StockReservationStatus {
  Active = 'active',
  Released = 'released',
  Consumed = 'consumed',
  Cancelled = 'cancelled',
}

export enum StockReservationSourceType {
  Dpr = 'dpr',
  Contractor = 'contractor',
  Labour = 'labour',
  Equipment = 'equipment',
  PurchaseOrder = 'purchase_order',
  MaterialRequest = 'material_request',
  Manual = 'manual',
}

@Schema({
  collection: 'stock_reservations',
  timestamps: true,
})
export class StockReservation {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  reservationNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: '', index: true })
  location!: string;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  baseUnitQuantity!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  releasedBaseQuantity!: number;

  @Prop({
    type: String,
    enum: StockReservationSourceType,
    required: true,
    index: true,
  })
  sourceType!: StockReservationSourceType;

  @Prop({ type: String, trim: true, default: null, index: true })
  sourceId!: string | null;

  @Prop({
    type: String,
    enum: StockReservationStatus,
    default: StockReservationStatus.Active,
    index: true,
  })
  status!: StockReservationStatus;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  releasedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  releasedAt!: Date | null;
}

export const StockReservationSchema =
  SchemaFactory.createForClass(StockReservation);

StockReservationSchema.plugin(baseSchemaPlugin);
StockReservationSchema.plugin(softDeletePlugin);

StockReservationSchema.index({
  projectId: 1,
  materialId: 1,
  location: 1,
  status: 1,
});
