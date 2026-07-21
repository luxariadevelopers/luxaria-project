import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type CostLayerDocument = HydratedDocument<CostLayer>;

/**
 * FIFO / average cost layer per material + project + location.
 * Remaining quantity is consumed by issues; receipts create new layers (FIFO)
 * or merge into average layers (WA / MA).
 */
@Schema({
  collection: 'inventory_cost_layers',
  timestamps: true,
})
export class CostLayer {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true, index: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: '', index: true })
  location!: string;

  @Prop({ type: Number, required: true, min: 0 })
  unitCost!: number;

  @Prop({ type: Number, required: true, min: 0 })
  originalQty!: number;

  @Prop({ type: Number, required: true, min: 0 })
  remainingQty!: number;

  @Prop({ type: Date, required: true, index: true })
  receivedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'MaterialStockTransaction', default: null })
  sourceLedgerId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  batch!: string | null;
}

export const CostLayerSchema = SchemaFactory.createForClass(CostLayer);

CostLayerSchema.index({
  projectId: 1,
  materialId: 1,
  location: 1,
  receivedAt: 1,
});
CostLayerSchema.index({
  projectId: 1,
  materialId: 1,
  location: 1,
  remainingQty: 1,
});
