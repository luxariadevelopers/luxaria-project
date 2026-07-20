import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type GoodsReceiptDocument = HydratedDocument<GoodsReceipt>;

export enum GoodsReceiptStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  QualityCheck = 'quality_check',
  Accepted = 'accepted',
  PartiallyAccepted = 'partially_accepted',
  Rejected = 'rejected',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class GoodsReceiptItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  /** PO line reference when created from a purchase order. */
  @Prop({ type: Types.ObjectId, default: null })
  purchaseOrderLineId!: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 0 })
  orderedQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  receivedQuantity!: number;

  /** Set during quality check; null until then. */
  @Prop({ type: Number, min: 0, default: null })
  acceptedQuantity!: number | null;

  @Prop({ type: Number, min: 0, default: null })
  rejectedQuantity!: number | null;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;
}

export const GoodsReceiptItemSchema =
  SchemaFactory.createForClass(GoodsReceiptItem);

@Schema({
  collection: 'goods_receipts',
  timestamps: true,
})
export class GoodsReceipt {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  grnNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true,
    index: true,
  })
  purchaseOrderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  deliveryChallanNumber!: string | null;

  @Prop({ type: String, trim: true, default: null })
  vehicleNumber!: string | null;

  @Prop({ type: Date, required: true, index: true })
  receivedDate!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  receivedBy!: Types.ObjectId;

  @Prop({ type: [GoodsReceiptItemSchema], default: [] })
  items!: GoodsReceiptItem[];

  /** Receipt photo document IDs or relative file paths (min 1 required). */
  @Prop({ type: [String], default: [] })
  photos!: string[];

  @Prop({ type: String, trim: true, default: null })
  challanDocument!: string | null;

  @Prop({ type: String, trim: true, default: null })
  weighbridgeDocument!: string | null;

  @Prop({ type: Number, required: true })
  latitude!: number;

  @Prop({ type: Number, required: true })
  longitude!: number;

  @Prop({
    type: String,
    enum: GoodsReceiptStatus,
    default: GoodsReceiptStatus.Draft,
    index: true,
  })
  status!: GoodsReceiptStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  qualityCheckedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  qualityCheckedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  idempotencyKey!: string | null;

  @Prop({ type: String, trim: true, default: null })
  clientTransactionId!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const GoodsReceiptSchema = SchemaFactory.createForClass(GoodsReceipt);

GoodsReceiptSchema.plugin(baseSchemaPlugin);
GoodsReceiptSchema.plugin(softDeletePlugin);

GoodsReceiptSchema.index({ projectId: 1, status: 1, receivedDate: -1 });
GoodsReceiptSchema.index({ purchaseOrderId: 1, createdAt: -1 });
GoodsReceiptSchema.index(
  { idempotencyKey: 1 },
  {
    name: 'uniq_grn_idempotency_key',
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
      isDeleted: false,
    },
  },
);
GoodsReceiptSchema.index({ grnNumber: 'text', deliveryChallanNumber: 'text' });
