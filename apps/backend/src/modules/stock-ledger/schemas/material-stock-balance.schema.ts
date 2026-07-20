import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type MaterialStockBalanceDocument =
  HydratedDocument<MaterialStockBalance>;

/**
 * Calculated on-hand stock per material / project / location.
 * Updated atomically with each immutable ledger post.
 */
@Schema({
  collection: 'material_stock_balances',
  timestamps: true,
})
export class MaterialStockBalance {
  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Empty string = default / unspecified location. */
  @Prop({ type: String, trim: true, default: '', index: true })
  location!: string;

  @Prop({ type: Number, required: true, default: 0 })
  quantityInBaseUnit!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  baseUnit!: MaterialUnit;

  /** Optimistic concurrency / audit of update count. */
  @Prop({ type: Number, required: true, default: 0 })
  version!: number;

  updatedAt?: Date;
  createdAt?: Date;
}

export const MaterialStockBalanceSchema =
  SchemaFactory.createForClass(MaterialStockBalance);

MaterialStockBalanceSchema.index(
  { materialId: 1, projectId: 1, location: 1 },
  { unique: true, name: 'uniq_stock_balance_scope' },
);
