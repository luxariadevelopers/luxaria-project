import type { Types } from 'mongoose';
import type { QuotationComparisonStatus } from './schemas/quotation-comparison.schema';

export type PublicComparisonVendorRow = {
  id: string;
  quotationId: string;
  quotationNumber: string;
  vendorId: string;
  vendorCode: string | null;
  vendorName: string | null;
  baseMaterialRate: number;
  gst: number;
  freight: number;
  discount: number;
  netLandedCost: number;
  deliveryDays: number;
  paymentTerms: string | null;
  vendorRating: number | null;
  previousQuality: number | null;
  previousDeliveryPerformance: number | null;
  isLowestLandedCost: boolean;
  isRecommended: boolean;
};

export type PublicQuotationComparison = {
  id: string;
  comparisonNumber: string;
  purchaseRequestId: string;
  projectId: string;
  vendors: PublicComparisonVendorRow[];
  status: QuotationComparisonStatus;
  lowestLandedCostQuotationId: string | null;
  recommendedQuotationId: string | null;
  recommendedVendorId: string | null;
  recommendationReason: string | null;
  isLowestVendorSelected: boolean;
  recommendedBy: string | null;
  recommendedAt: Date | null;
  approvalRequestId: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  pdfPath: string | null;
  pdfGeneratedAt: Date | null;
  generatedBy: string;
  generatedAt: Date;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type VendorRowLike = {
  _id?: Types.ObjectId | string;
  quotationId: Types.ObjectId | string;
  quotationNumber: string;
  vendorId: Types.ObjectId | string;
  vendorCode?: string | null;
  vendorName?: string | null;
  baseMaterialRate: number;
  gst: number;
  freight: number;
  discount: number;
  netLandedCost: number;
  deliveryDays: number;
  paymentTerms?: string | null;
  vendorRating?: number | null;
  previousQuality?: number | null;
  previousDeliveryPerformance?: number | null;
  isLowestLandedCost?: boolean;
  isRecommended?: boolean;
};

type ComparisonLike = {
  _id: Types.ObjectId | string;
  comparisonNumber: string;
  purchaseRequestId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  vendors?: VendorRowLike[];
  status: QuotationComparisonStatus;
  lowestLandedCostQuotationId?: Types.ObjectId | string | null;
  recommendedQuotationId?: Types.ObjectId | string | null;
  recommendedVendorId?: Types.ObjectId | string | null;
  recommendationReason?: string | null;
  isLowestVendorSelected?: boolean;
  recommendedBy?: Types.ObjectId | string | null;
  recommendedAt?: Date | null;
  approvalRequestId?: Types.ObjectId | string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: Date | null;
  generatedBy: Types.ObjectId | string;
  generatedAt: Date;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicComparisonVendorRow(
  row: VendorRowLike,
): PublicComparisonVendorRow {
  return {
    id: String(row._id ?? ''),
    quotationId: String(row.quotationId),
    quotationNumber: row.quotationNumber,
    vendorId: String(row.vendorId),
    vendorCode: row.vendorCode ?? null,
    vendorName: row.vendorName ?? null,
    baseMaterialRate: row.baseMaterialRate,
    gst: row.gst,
    freight: row.freight,
    discount: row.discount,
    netLandedCost: row.netLandedCost,
    deliveryDays: row.deliveryDays,
    paymentTerms: row.paymentTerms ?? null,
    vendorRating: row.vendorRating ?? null,
    previousQuality: row.previousQuality ?? null,
    previousDeliveryPerformance: row.previousDeliveryPerformance ?? null,
    isLowestLandedCost: Boolean(row.isLowestLandedCost),
    isRecommended: Boolean(row.isRecommended),
  };
}

export function toPublicQuotationComparison(
  row: ComparisonLike,
): PublicQuotationComparison {
  return {
    id: String(row._id),
    comparisonNumber: row.comparisonNumber,
    purchaseRequestId: String(row.purchaseRequestId),
    projectId: String(row.projectId),
    vendors: (row.vendors ?? []).map(toPublicComparisonVendorRow),
    status: row.status,
    lowestLandedCostQuotationId: row.lowestLandedCostQuotationId
      ? String(row.lowestLandedCostQuotationId)
      : null,
    recommendedQuotationId: row.recommendedQuotationId
      ? String(row.recommendedQuotationId)
      : null,
    recommendedVendorId: row.recommendedVendorId
      ? String(row.recommendedVendorId)
      : null,
    recommendationReason: row.recommendationReason ?? null,
    isLowestVendorSelected: Boolean(row.isLowestVendorSelected),
    recommendedBy: row.recommendedBy ? String(row.recommendedBy) : null,
    recommendedAt: row.recommendedAt ?? null,
    approvalRequestId: row.approvalRequestId
      ? String(row.approvalRequestId)
      : null,
    submittedBy: row.submittedBy ? String(row.submittedBy) : null,
    submittedAt: row.submittedAt ?? null,
    pdfPath: row.pdfPath ?? null,
    pdfGeneratedAt: row.pdfGeneratedAt ?? null,
    generatedBy: String(row.generatedBy),
    generatedAt: row.generatedAt,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
