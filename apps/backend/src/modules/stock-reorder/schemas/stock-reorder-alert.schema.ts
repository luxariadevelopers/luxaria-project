import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type StockReorderAlertDocument = HydratedDocument<StockReorderAlert>;

export enum StockReorderAlertType {
  BelowReorderLevel = 'below_reorder_level',
  BelowMinimumLevel = 'below_minimum_level',
  ExpectedStockoutWithinDays = 'expected_stockout_within_days',
  NoOpenPurchaseOrder = 'no_open_purchase_order',
  ExcessStock = 'excess_stock',
  SlowMovingStock = 'slow_moving_stock',
}

export enum StockReorderAlertStatus {
  Open = 'open',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
}

@Schema({
  collection: 'stock_reorder_alerts',
  timestamps: true,
})
export class StockReorderAlert {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({
    type: String,
    enum: StockReorderAlertType,
    required: true,
    index: true,
  })
  alertType!: StockReorderAlertType;

  @Prop({
    type: String,
    enum: StockReorderAlertStatus,
    required: true,
    default: StockReorderAlertStatus.Open,
    index: true,
  })
  status!: StockReorderAlertStatus;

  @Prop({ type: String, trim: true, required: true })
  message!: string;

  @Prop({ type: Number, required: true, default: 0 })
  availableStock!: number;

  @Prop({ type: Number, required: true, default: 0 })
  pendingPoQuantity!: number;

  @Prop({ type: Number, required: true, default: 0 })
  averageDailyConsumption!: number;

  @Prop({ type: Date, default: null })
  estimatedStockOutDate!: Date | null;

  @Prop({ type: Number, required: true, default: 0 })
  reorderLevel!: number;

  @Prop({ type: Number, required: true, default: 0 })
  recommendedPurchaseQuantity!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  baseUnit!: MaterialUnit;

  @Prop({ type: Date, required: true, index: true })
  evaluatedAt!: Date;

  @Prop({ type: String, trim: true, default: null })
  jobId!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StockReorderAlertSchema =
  SchemaFactory.createForClass(StockReorderAlert);

StockReorderAlertSchema.plugin(baseSchemaPlugin);
StockReorderAlertSchema.plugin(softDeletePlugin);

StockReorderAlertSchema.index(
  { projectId: 1, materialId: 1, alertType: 1, status: 1 },
  { name: 'idx_stock_reorder_alert_scope' },
);
StockReorderAlertSchema.index({ projectId: 1, evaluatedAt: -1 });
