import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type StockTransferDocument = HydratedDocument<StockTransfer>;

export enum StockTransferStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

export enum StockTransferScope {
  WarehouseToWarehouse = 'warehouse_to_warehouse',
  SiteToSite = 'site_to_site',
  ProjectToProject = 'project_to_project',
  WarehouseToSite = 'warehouse_to_site',
}

@Schema({ _id: true })
export class StockTransferItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  baseUnitQuantity!: number;

  @Prop({ type: String, trim: true, default: null })
  batch!: string | null;

  @Prop({ type: [String], default: [] })
  serialNumbers!: string[];

  @Prop({ type: Types.ObjectId, ref: 'MaterialStockTransaction', default: null })
  sourceLedgerId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'MaterialStockTransaction', default: null })
  destLedgerId!: Types.ObjectId | null;
}

export const StockTransferItemSchema =
  SchemaFactory.createForClass(StockTransferItem);

@Schema({
  collection: 'stock_transfers',
  timestamps: true,
})
export class StockTransfer {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  transferNumber!: string;

  @Prop({
    type: String,
    enum: StockTransferScope,
    required: true,
    index: true,
  })
  scope!: StockTransferScope;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  sourceProjectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  destProjectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  sourceWarehouseId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  destWarehouseId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  sourceSiteId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  destSiteId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: '' })
  sourceLocation!: string;

  @Prop({ type: String, trim: true, default: '' })
  destLocation!: string;

  @Prop({ type: Date, required: true, index: true })
  transferDate!: Date;

  @Prop({ type: [StockTransferItemSchema], default: [] })
  items!: StockTransferItem[];

  @Prop({
    type: String,
    enum: StockTransferStatus,
    default: StockTransferStatus.Draft,
    index: true,
  })
  status!: StockTransferStatus;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;
}

export const StockTransferSchema = SchemaFactory.createForClass(StockTransfer);

StockTransferSchema.plugin(baseSchemaPlugin);
StockTransferSchema.plugin(softDeletePlugin);

StockTransferSchema.index({ sourceProjectId: 1, status: 1, transferDate: -1 });
StockTransferSchema.index({ destProjectId: 1, status: 1, transferDate: -1 });
