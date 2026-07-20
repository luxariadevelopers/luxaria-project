import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type QuotationComparisonDocument = HydratedDocument<QuotationComparison>;

export enum QuotationComparisonStatus {
  Draft = 'draft',
  Recommended = 'recommended',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

/**
 * Snapshot of one vendor quotation in a comparison statement.
 * Monetary values are in ₹ unless noted.
 */
@Schema({ _id: true })
export class ComparisonVendorRow {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'VendorQuotation', required: true })
  quotationId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  quotationNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  vendorCode!: string | null;

  @Prop({ type: String, trim: true, default: null })
  vendorName!: string | null;

  /** Weighted average base material rate (Σ qty×rate / Σ qty). */
  @Prop({ type: Number, required: true, min: 0 })
  baseMaterialRate!: number;

  /** Line GST/tax amounts + header taxes. */
  @Prop({ type: Number, required: true, min: 0 })
  gst!: number;

  @Prop({ type: Number, required: true, min: 0 })
  freight!: number;

  /** Line discounts + header discount. */
  @Prop({ type: Number, required: true, min: 0 })
  discount!: number;

  /** Net landed cost = quotation grandTotal. */
  @Prop({ type: Number, required: true, min: 0 })
  netLandedCost!: number;

  @Prop({ type: Number, required: true, min: 0 })
  deliveryDays!: number;

  @Prop({ type: String, trim: true, default: null })
  paymentTerms!: string | null;

  @Prop({ type: Number, min: 0, max: 5, default: null })
  vendorRating!: number | null;

  /** Historical quality score 0–5 (optional until GRN history exists). */
  @Prop({ type: Number, min: 0, max: 5, default: null })
  previousQuality!: number | null;

  /** Historical on-time delivery score 0–5 (optional until GRN history exists). */
  @Prop({ type: Number, min: 0, max: 5, default: null })
  previousDeliveryPerformance!: number | null;

  @Prop({ type: Boolean, default: false })
  isLowestLandedCost!: boolean;

  @Prop({ type: Boolean, default: false })
  isRecommended!: boolean;
}

export const ComparisonVendorRowSchema =
  SchemaFactory.createForClass(ComparisonVendorRow);

@Schema({
  collection: 'quotation_comparisons',
  timestamps: true,
})
export class QuotationComparison {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  comparisonNumber!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'PurchaseRequest',
    required: true,
    index: true,
  })
  purchaseRequestId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: [ComparisonVendorRowSchema], default: [] })
  vendors!: ComparisonVendorRow[];

  @Prop({
    type: String,
    enum: QuotationComparisonStatus,
    default: QuotationComparisonStatus.Draft,
    index: true,
  })
  status!: QuotationComparisonStatus;

  @Prop({ type: Types.ObjectId, ref: 'VendorQuotation', default: null })
  lowestLandedCostQuotationId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'VendorQuotation', default: null })
  recommendedQuotationId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Vendor', default: null })
  recommendedVendorId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  recommendationReason!: string | null;

  @Prop({ type: Boolean, default: false })
  isLowestVendorSelected!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recommendedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  recommendedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  pdfPath!: string | null;

  @Prop({ type: Date, default: null })
  pdfGeneratedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  generatedBy!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  generatedAt!: Date;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const QuotationComparisonSchema =
  SchemaFactory.createForClass(QuotationComparison);

QuotationComparisonSchema.plugin(baseSchemaPlugin);
QuotationComparisonSchema.plugin(softDeletePlugin);

QuotationComparisonSchema.index({ purchaseRequestId: 1, status: 1 });
QuotationComparisonSchema.index({ projectId: 1, createdAt: -1 });
QuotationComparisonSchema.index({ comparisonNumber: 'text' });
