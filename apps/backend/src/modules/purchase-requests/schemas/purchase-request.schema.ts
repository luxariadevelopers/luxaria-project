import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type PurchaseRequestDocument = HydratedDocument<PurchaseRequest>;

export enum PurchaseRequestStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Reviewed = 'reviewed',
  Approved = 'approved',
  Sourcing = 'sourcing',
  Closed = 'closed',
  Rejected = 'rejected',
  Returned = 'returned',
  Cancelled = 'cancelled',
}

export enum PurchaseRequestPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

export enum PurchaseRequestLineStatus {
  Pending = 'pending',
  Approved = 'approved',
  PartiallyApproved = 'partially_approved',
  Rejected = 'rejected',
}

@Schema({ _id: true })
export class PurchaseRequestItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  requestedQuantity!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  /** Snapshot in the line unit at request time. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  currentStock!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  reorderLevel!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  minimumStock!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  maximumStock!: number;

  @Prop({ type: Number, min: 0, default: null })
  estimatedRate!: number | null;

  @Prop({ type: Types.ObjectId, default: null })
  boqItemId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  /** Set on approval; null until then. */
  @Prop({ type: Number, min: 0, default: null })
  approvedQuantity!: number | null;

  @Prop({
    type: String,
    enum: PurchaseRequestLineStatus,
    default: PurchaseRequestLineStatus.Pending,
  })
  lineStatus!: PurchaseRequestLineStatus;

  @Prop({ type: [String], default: [] })
  warnings!: string[];
}

export const PurchaseRequestItemSchema =
  SchemaFactory.createForClass(PurchaseRequestItem);

@Schema({
  collection: 'purchase_requests',
  timestamps: true,
})
export class PurchaseRequest {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  requestNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Optional requesting site (must belong to project). */
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null, index: true })
  siteId!: Types.ObjectId | null;

  /** Optional warehouse / store site for delivery planning. */
  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  warehouseSiteId!: Types.ObjectId | null;

  /** When created from MRP / stock-reorder alert. */
  @Prop({
    type: Types.ObjectId,
    ref: 'StockReorderAlert',
    default: null,
    index: true,
  })
  sourceReorderAlertId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  requiredByDate!: Date;

  @Prop({
    type: String,
    enum: PurchaseRequestPriority,
    default: PurchaseRequestPriority.Normal,
    index: true,
  })
  priority!: PurchaseRequestPriority;

  @Prop({ type: [PurchaseRequestItemSchema], default: [] })
  items!: PurchaseRequestItem[];

  @Prop({ required: true, trim: true })
  justification!: string;

  @Prop({
    type: String,
    enum: PurchaseRequestStatus,
    default: PurchaseRequestStatus.Draft,
    index: true,
  })
  status!: PurchaseRequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  reviewNotes!: string | null;

  @Prop({ type: String, trim: true, default: null })
  approvalNotes!: string | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason!: string | null;

  @Prop({ type: Boolean, default: false })
  isPartiallyApproved!: boolean;

  @Prop({ type: [String], default: [] })
  warnings!: string[];

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PurchaseRequestSchema =
  SchemaFactory.createForClass(PurchaseRequest);

PurchaseRequestSchema.plugin(baseSchemaPlugin);
PurchaseRequestSchema.plugin(softDeletePlugin);

PurchaseRequestSchema.index({ projectId: 1, status: 1, createdAt: -1 });
PurchaseRequestSchema.index({ requestedBy: 1, createdAt: -1 });
PurchaseRequestSchema.index({
  requestNumber: 'text',
  justification: 'text',
});
