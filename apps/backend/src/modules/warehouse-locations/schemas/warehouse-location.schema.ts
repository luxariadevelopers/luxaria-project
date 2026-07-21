import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type WarehouseLocationDocument = HydratedDocument<WarehouseLocation>;

export enum WarehouseLocationLevel {
  Zone = 'zone',
  Rack = 'rack',
  Bin = 'bin',
}

export enum WarehouseLocationStatus {
  Active = 'active',
  Inactive = 'inactive',
}

/**
 * Hierarchical storage under a project warehouse site:
 * Warehouse (Site) → Zone → Rack → Bin
 */
@Schema({
  collection: 'warehouse_locations',
  timestamps: true,
})
export class WarehouseLocation {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Site', required: true, index: true })
  warehouseId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'WarehouseLocation',
    default: null,
    index: true,
  })
  parentId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: WarehouseLocationLevel,
    required: true,
    index: true,
  })
  level!: WarehouseLocationLevel;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Number, min: 0, default: null })
  capacity!: number | null;

  @Prop({
    type: String,
    enum: WarehouseLocationStatus,
    default: WarehouseLocationStatus.Active,
    index: true,
  })
  status!: WarehouseLocationStatus;

  /** Path for stock balance location key, e.g. MAIN/Z1/R2/B3 */
  @Prop({ type: String, trim: true, uppercase: true, required: true, index: true })
  locationPath!: string;
}

export const WarehouseLocationSchema =
  SchemaFactory.createForClass(WarehouseLocation);

WarehouseLocationSchema.plugin(baseSchemaPlugin);
WarehouseLocationSchema.plugin(softDeletePlugin);

WarehouseLocationSchema.index(
  { warehouseId: 1, parentId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

WarehouseLocationSchema.index({ projectId: 1, level: 1, status: 1 });
WarehouseLocationSchema.index({ projectId: 1, locationPath: 1 });
