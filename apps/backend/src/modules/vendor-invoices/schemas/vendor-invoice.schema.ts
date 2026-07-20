import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type VendorInvoiceDocument = HydratedDocument<VendorInvoice>;

export enum VendorInvoiceStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Verification = 'verification',
  Matching = 'matching',
  Approval = 'approval',
  Posted = 'posted',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

export enum VendorInvoiceMatchingStatus {
  Pending = 'pending',
  Matched = 'matched',
  MatchedWithTolerance = 'matched_with_tolerance',
  Exception = 'exception',
  Rejected = 'rejected',
}

export enum VendorInvoiceVarianceType {
  Material = 'material',
  Quantity = 'quantity',
  Rate = 'rate',
  Tax = 'tax',
  Freight = 'freight',
  Discount = 'discount',
  Total = 'total',
  Amount = 'amount',
}

export enum VendorInvoiceVarianceSeverity {
  Info = 'info',
  Warning = 'warning',
  Exception = 'exception',
}

@Schema({ _id: true })
export class VendorInvoiceItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({ type: Types.ObjectId, default: null })
  purchaseOrderLineId!: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tax!: number;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  /** Snapshot from PO at matching time. */
  @Prop({ type: Number, default: null })
  poRate!: number | null;

  @Prop({ type: Number, default: null })
  poOrderedQuantity!: number | null;

  /** Aggregate accepted GRN qty for this material/PO line across linked GRNs. */
  @Prop({ type: Number, default: null })
  grnAcceptedQuantity!: number | null;

  @Prop({ type: Number, default: null })
  quantityVariance!: number | null;

  @Prop({ type: Number, default: null })
  rateVariance!: number | null;

  @Prop({ type: Number, default: null })
  taxVariance!: number | null;

  @Prop({ type: Number, default: null })
  poLineTax!: number | null;
}

export const VendorInvoiceItemSchema =
  SchemaFactory.createForClass(VendorInvoiceItem);

@Schema({ _id: true })
export class VendorInvoiceVariance {
  _id?: Types.ObjectId;

  @Prop({ type: String, enum: VendorInvoiceVarianceType, required: true })
  type!: VendorInvoiceVarianceType;

  @Prop({ type: Types.ObjectId, ref: 'Material', default: null })
  materialId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, required: true })
  message!: string;

  @Prop({ type: Number, default: null })
  expected!: number | null;

  @Prop({ type: Number, default: null })
  actual!: number | null;

  @Prop({
    type: String,
    enum: VendorInvoiceVarianceSeverity,
    required: true,
  })
  severity!: VendorInvoiceVarianceSeverity;
}

export const VendorInvoiceVarianceSchema = SchemaFactory.createForClass(
  VendorInvoiceVariance,
);

@Schema({
  collection: 'vendor_invoices',
  timestamps: true,
})
export class VendorInvoice {
  /** System document number VI-YYYY-###### */
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  documentNumber!: string;

  /** Vendor’s own invoice number (duplicate-checked per vendor). */
  @Prop({ required: true, trim: true, uppercase: true, index: true })
  invoiceNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true,
    index: true,
  })
  purchaseOrderId!: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'GoodsReceipt' }], default: [] })
  grnIds!: Types.ObjectId[];

  @Prop({ type: Date, required: true, index: true })
  invoiceDate!: Date;

  @Prop({ type: Date, required: true })
  dueDate!: Date;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxableValue!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  gst!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tds!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  retention!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  freight!: number;

  /** Invoice-level discount for three-way match vs PO discount. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalAmount!: number;

  /**
   * Cumulative amount paid against this invoice (net of invoice TDS/retention).
   * Remaining payable = (totalAmount − tds − retention) − paidAmount.
   */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  paidAmount!: number;

  /** Document id / path for the vendor invoice scan. */
  @Prop({ type: String, trim: true, default: null })
  invoiceDocument!: string | null;

  @Prop({ type: [VendorInvoiceItemSchema], default: [] })
  items!: VendorInvoiceItem[];

  @Prop({ type: [VendorInvoiceVarianceSchema], default: [] })
  variances!: VendorInvoiceVariance[];

  @Prop({
    type: String,
    enum: VendorInvoiceMatchingStatus,
    required: true,
    default: VendorInvoiceMatchingStatus.Pending,
    index: true,
  })
  matchingStatus!: VendorInvoiceMatchingStatus;

  /** Set when an exception matching result is explicitly approved. */
  @Prop({ type: Boolean, default: false })
  exceptionApproved!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  exceptionApprovedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  exceptionApprovedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  exceptionApprovedComment!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  matchingRejectedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  matchingRejectedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  matchingRejectionReason!: string | null;

  @Prop({
    type: String,
    enum: VendorInvoiceStatus,
    required: true,
    default: VendorInvoiceStatus.Draft,
    index: true,
  })
  status!: VendorInvoiceStatus;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  matchedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  matchedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  paidBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorInvoiceSchema = SchemaFactory.createForClass(VendorInvoice);

VendorInvoiceSchema.plugin(baseSchemaPlugin);
VendorInvoiceSchema.plugin(softDeletePlugin);

VendorInvoiceSchema.index(
  { vendorId: 1, invoiceNumber: 1 },
  { unique: true, name: 'uniq_vendor_invoice_number' },
);
VendorInvoiceSchema.index({ projectId: 1, status: 1, invoiceDate: -1 });
VendorInvoiceSchema.index({ purchaseOrderId: 1, status: 1 });
VendorInvoiceSchema.index({ invoiceNumber: 'text', documentNumber: 'text' });
