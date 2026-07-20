import type { PurchaseRequestStatus } from '@luxaria/shared-types';

/** Nest `VendorQuotationStatus` */
export const VendorQuotationStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Final: 'final',
  Superseded: 'superseded',
  Cancelled: 'cancelled',
} as const;

export type VendorQuotationStatus =
  (typeof VendorQuotationStatus)[keyof typeof VendorQuotationStatus];

/** Nest `MaterialUnit` string values. */
export type MaterialUnit =
  | 'number'
  | 'bag'
  | 'kilogram'
  | 'ton'
  | 'litre'
  | 'metre'
  | 'square_foot'
  | 'cubic_foot'
  | 'load'
  | 'box';

export type PublicQuotationDocument = {
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
} | null;

export type PublicVendorQuotationItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax: number;
  discount: number;
  total: number;
};

/** Nest `toPublicVendorQuotation` */
export type PublicVendorQuotation = {
  id: string;
  quotationNumber: string;
  purchaseRequestId: string;
  projectId: string;
  vendorId: string;
  quotationDate: string;
  validityDate: string;
  deliveryDays: number;
  paymentTerms: string | null;
  freight: number;
  taxes: number;
  discount: number;
  items: PublicVendorQuotationItem[];
  quotationDocument: PublicQuotationDocument;
  status: VendorQuotationStatus;
  revisionNumber: number;
  rootQuotationId: string | null;
  revisedFromId: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  itemsSubtotal: number;
  grandTotal: number;
  createdAt?: string;
  updatedAt?: string;
};

export type VendorQuotationItemInput = {
  materialId: string;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax?: number;
  discount?: number;
};

export type CreateVendorQuotationInput = {
  purchaseRequestId: string;
  vendorId: string;
  quotationDate: string;
  validityDate: string;
  deliveryDays?: number;
  paymentTerms?: string | null;
  freight?: number;
  taxes?: number;
  discount?: number;
  items: VendorQuotationItemInput[];
};

export type UpdateVendorQuotationInput = Partial<CreateVendorQuotationInput>;

export type ReviseVendorQuotationInput = Partial<CreateVendorQuotationInput>;

export type ListVendorQuotationsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  purchaseRequestId?: string;
  vendorId?: string;
  projectId?: string;
  status?: VendorQuotationStatus;
};

export type PaginatedQuotations = {
  items: PublicVendorQuotation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** Minimal PR row for eligible quotation sourcing. */
export type EligiblePurchaseRequestRow = {
  id: string;
  requestNumber: string;
  projectId: string;
  status: PurchaseRequestStatus;
  estimatedTotal: number;
};

export type PurchaseRequestLineStatus =
  | 'pending'
  | 'approved'
  | 'partially_approved'
  | 'rejected';

export type PurchaseRequestLineForQuote = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  requestedQuantity: number;
  unit: MaterialUnit;
  approvedQuantity: number | null;
  lineStatus: PurchaseRequestLineStatus;
  estimatedRate: number | null;
};

export type PurchaseRequestDetailForQuote = {
  id: string;
  requestNumber: string;
  projectId: string;
  status: PurchaseRequestStatus;
  items: PurchaseRequestLineForQuote[];
};

export type VendorOption = {
  id: string;
  vendorCode: string;
  legalName: string;
  status: string;
};
