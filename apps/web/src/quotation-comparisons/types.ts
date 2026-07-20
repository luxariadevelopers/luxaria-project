/**
 * Mirrors Nest `PublicQuotationComparison` / vendor row
 * (`quotation-comparisons.mapper.ts`).
 */

export const QuotationComparisonStatus = {
  Draft: 'draft',
  Recommended: 'recommended',
  PendingApproval: 'pending_approval',
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;

export type QuotationComparisonStatus =
  (typeof QuotationComparisonStatus)[keyof typeof QuotationComparisonStatus];

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
  status: QuotationComparisonStatus | string;
  lowestLandedCostQuotationId: string | null;
  recommendedQuotationId: string | null;
  recommendedVendorId: string | null;
  recommendationReason: string | null;
  isLowestVendorSelected: boolean;
  recommendedBy: string | null;
  recommendedAt: string | null;
  approvalRequestId: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  pdfPath: string | null;
  pdfGeneratedAt: string | null;
  /** Present on export-pdf success envelope. */
  downloadPath?: string | null;
  generatedBy: string;
  generatedAt: string;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListQuotationComparisonsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  purchaseRequestId?: string;
  projectId?: string;
  status?: QuotationComparisonStatus | string;
};

export type VendorHistoryOverride = {
  vendorId: string;
  previousQuality?: number | null;
  previousDeliveryPerformance?: number | null;
};

export type GenerateQuotationComparisonInput = {
  purchaseRequestId: string;
  vendorHistory?: VendorHistoryOverride[];
  notes?: string | null;
};

export type RecommendQuotationComparisonInput = {
  quotationId: string;
  reason?: string | null;
};

export type PaginatedQuotationComparisons = {
  items: PublicQuotationComparison[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
