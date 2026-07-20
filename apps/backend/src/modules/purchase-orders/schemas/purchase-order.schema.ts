import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import {
  AddressEmbed,
  AddressEmbedSchema,
} from '../../company/schemas/address.embed';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>;

export enum PurchaseOrderStatus {
  Draft = 'draft',
  PendingApproval = 'pending_approval',
  Issued = 'issued',
  PartiallyReceived = 'partially_received',
  FullyReceived = 'fully_received',
  Closed = 'closed',
  Cancelled = 'cancelled',
  Superseded = 'superseded',
  Rejected = 'rejected',
}

@Schema({ _id: true })
export class PurchaseOrderItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  /** Ordered quantity (PO qty). */
  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tax!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  total!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  receivedQuantity!: number;

  /** quantity − receivedQuantity (may go slightly negative within tolerance). */
  @Prop({ type: Number, required: true, default: 0 })
  balanceQuantity!: number;
}

export const PurchaseOrderItemSchema =
  SchemaFactory.createForClass(PurchaseOrderItem);

@Schema({
  collection: 'purchase_orders',
  timestamps: true,
})
export class PurchaseOrder {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  purchaseOrderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'PurchaseRequest',
    required: true,
    index: true,
  })
  purchaseRequestId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'VendorQuotation',
    required: true,
    index: true,
  })
  selectedQuotationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  orderDate!: Date;

  @Prop({ type: Date, required: true })
  expectedDeliveryDate!: Date;

  @Prop({ type: AddressEmbedSchema, required: true })
  billingAddress!: AddressEmbed;

  @Prop({ type: AddressEmbedSchema, required: true })
  deliveryAddress!: AddressEmbed;

  @Prop({ type: String, trim: true, default: null })
  paymentTerms!: string | null;

  @Prop({ type: [PurchaseOrderItemSchema], default: [] })
  items!: PurchaseOrderItem[];

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  subtotal!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxes!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  freight!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  total!: number;

  /** Terms & conditions text. */
  @Prop({ type: String, trim: true, default: null })
  terms!: string | null;

  @Prop({
    type: String,
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.Draft,
    index: true,
  })
  status!: PurchaseOrderStatus;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  revisionNumber!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'PurchaseOrder',
    default: null,
    index: true,
  })
  rootPurchaseOrderId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder', default: null })
  revisedFromId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  issuedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  issuedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  pdfPath!: string | null;

  @Prop({ type: Date, default: null })
  pdfGeneratedAt!: Date | null;

  /** Aggregate open qty balance across lines. */
  @Prop({ type: Number, required: true, default: 0 })
  balanceQuantity!: number;

  /** Aggregate open value balance (unreceived line value estimate). */
  @Prop({ type: Number, required: true, default: 0 })
  balanceAmount!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

PurchaseOrderSchema.plugin(baseSchemaPlugin);
PurchaseOrderSchema.plugin(softDeletePlugin);

PurchaseOrderSchema.index({ projectId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ vendorId: 1, status: 1 });
PurchaseOrderSchema.index({ purchaseRequestId: 1, revisionNumber: -1 });
PurchaseOrderSchema.index({ purchaseOrderNumber: 'text', terms: 'text' });
