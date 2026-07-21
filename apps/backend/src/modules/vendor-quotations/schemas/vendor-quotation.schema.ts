import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { MaterialUnit } from '../../material-master/schemas/material.schema';

export type VendorQuotationDocument = HydratedDocument<VendorQuotation>;

export enum VendorQuotationStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Final = 'final',
  Superseded = 'superseded',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class VendorQuotationItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Material', required: true })
  materialId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  materialCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  materialName!: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: String, enum: MaterialUnit, required: true })
  unit!: MaterialUnit;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  /** Line tax amount (₹). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  tax!: number;

  /** Line discount amount (₹). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  /** quantity × rate − discount + tax */
  @Prop({ type: Number, required: true, min: 0 })
  total!: number;
}

export const VendorQuotationItemSchema =
  SchemaFactory.createForClass(VendorQuotationItem);

@Schema({ _id: false })
export class QuotationDocumentFile {
  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, trim: true, default: null })
  mimeType!: string | null;

  @Prop({ type: Number, min: 0, default: 0 })
  sizeBytes!: number;

  @Prop({ type: Date, required: true })
  uploadedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId;
}

export const QuotationDocumentFileSchema =
  SchemaFactory.createForClass(QuotationDocumentFile);

@Schema({
  collection: 'vendor_quotations',
  timestamps: true,
})
export class VendorQuotation {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  quotationNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'PurchaseRequest',
    required: true,
    index: true,
  })
  purchaseRequestId!: Types.ObjectId;

  /** Optional RFQ this quotation responds to. */
  @Prop({ type: Types.ObjectId, ref: 'Rfq', default: null, index: true })
  rfqId!: Types.ObjectId | null;

  /** Denormalized from PR for scoping / numbering. */
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  quotationDate!: Date;

  @Prop({ type: Date, required: true })
  validityDate!: Date;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  deliveryDays!: number;

  @Prop({ type: String, trim: true, default: null })
  paymentTerms!: string | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  freight!: number;

  /** Header-level tax amount (₹). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  taxes!: number;

  /** Header-level discount amount (₹). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  @Prop({ type: [VendorQuotationItemSchema], default: [] })
  items!: VendorQuotationItem[];

  @Prop({ type: QuotationDocumentFileSchema, default: null })
  quotationDocument!: QuotationDocumentFile | null;

  @Prop({
    type: String,
    enum: VendorQuotationStatus,
    default: VendorQuotationStatus.Draft,
    index: true,
  })
  status!: VendorQuotationStatus;

  /** Revision chain: 1 for original; increments on revise. */
  @Prop({ type: Number, required: true, min: 1, default: 1 })
  revisionNumber!: number;

  /** First quotation in the revision chain (self for original). */
  @Prop({
    type: Types.ObjectId,
    ref: 'VendorQuotation',
    default: null,
    index: true,
  })
  rootQuotationId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'VendorQuotation', default: null })
  revisedFromId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  finalizedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  finalizedAt!: Date | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  itemsSubtotal!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  grandTotal!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorQuotationSchema =
  SchemaFactory.createForClass(VendorQuotation);

VendorQuotationSchema.plugin(baseSchemaPlugin);
VendorQuotationSchema.plugin(softDeletePlugin);

VendorQuotationSchema.index({
  purchaseRequestId: 1,
  vendorId: 1,
  revisionNumber: -1,
});
VendorQuotationSchema.index({ purchaseRequestId: 1, status: 1 });
VendorQuotationSchema.index({
  quotationNumber: 'text',
  paymentTerms: 'text',
});
