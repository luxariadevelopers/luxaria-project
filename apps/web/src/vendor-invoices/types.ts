/**
 * Mirrors Nest public shapes for vendor invoices
 * (`vendor-invoices.mapper.ts` / Swagger tag Vendor Invoices).
 */

import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '@/status';
import type { MaterialUnit } from '@/purchase-orders/types';

export { VendorInvoiceMatchingStatus, VendorInvoiceStatus };
export type { MaterialUnit };

export const VendorInvoiceVarianceType = {
  Material: 'material',
  Quantity: 'quantity',
  Rate: 'rate',
  Tax: 'tax',
  Freight: 'freight',
  Discount: 'discount',
  Total: 'total',
  Amount: 'amount',
} as const;

export type VendorInvoiceVarianceType =
  (typeof VendorInvoiceVarianceType)[keyof typeof VendorInvoiceVarianceType];

export const VendorInvoiceVarianceSeverity = {
  Info: 'info',
  Warning: 'warning',
  Exception: 'exception',
} as const;

export type VendorInvoiceVarianceSeverity =
  (typeof VendorInvoiceVarianceSeverity)[keyof typeof VendorInvoiceVarianceSeverity];

export type PublicVendorInvoiceItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  purchaseOrderLineId: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax: number;
  amount: number;
  poRate: number | null;
  poOrderedQuantity: number | null;
  grnAcceptedQuantity: number | null;
  quantityVariance: number | null;
  rateVariance: number | null;
  taxVariance: number | null;
  poLineTax: number | null;
};

export type PublicVendorInvoiceVariance = {
  id: string;
  type: VendorInvoiceVarianceType;
  materialId: string | null;
  message: string;
  expected: number | null;
  actual: number | null;
  severity: VendorInvoiceVarianceSeverity;
};

export type PublicVendorInvoice = {
  id: string;
  documentNumber: string;
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  purchaseOrderId: string;
  grnIds: string[];
  invoiceDate: string;
  dueDate: string;
  taxableValue: number;
  gst: number;
  tds: number;
  retention: number;
  freight: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingPayable: number;
  invoiceDocument: string | null;
  items: PublicVendorInvoiceItem[];
  variances: PublicVendorInvoiceVariance[];
  matchingStatus: VendorInvoiceMatchingStatus;
  exceptionApproved: boolean;
  exceptionApprovedBy: string | null;
  exceptionApprovedAt: string | null;
  exceptionApprovedComment: string | null;
  matchingRejectedBy: string | null;
  matchingRejectedAt: string | null;
  matchingRejectionReason: string | null;
  status: VendorInvoiceStatus;
  journalEntryId: string | null;
  notes: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  matchedBy: string | null;
  matchedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  paidBy: string | null;
  paidAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type VendorInvoiceItemInput = {
  materialId: string;
  purchaseOrderLineId?: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax?: number;
};

export type CreateVendorInvoiceInput = {
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  purchaseOrderId: string;
  grnIds: string[];
  invoiceDate: string;
  dueDate: string;
  taxableValue: number;
  gst: number;
  tds?: number;
  retention?: number;
  freight?: number;
  discount?: number;
  totalAmount: number;
  invoiceDocument?: string | null;
  notes?: string | null;
  items: VendorInvoiceItemInput[];
};

export type UpdateVendorInvoiceInput = {
  invoiceNumber?: string;
  grnIds?: string[];
  invoiceDate?: string;
  dueDate?: string;
  taxableValue?: number;
  gst?: number;
  tds?: number;
  retention?: number;
  freight?: number;
  discount?: number;
  totalAmount?: number;
  invoiceDocument?: string | null;
  notes?: string | null;
  items?: VendorInvoiceItemInput[];
};

export type ListVendorInvoicesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  vendorId?: string;
  purchaseOrderId?: string;
  status?: VendorInvoiceStatus;
  matchingStatus?: VendorInvoiceMatchingStatus;
};

export type PaginatedVendorInvoices = {
  items: PublicVendorInvoice[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type ApproveVendorInvoiceInput = {
  exceptionApprovalComment?: string | null;
};

export type RejectMatchingInput = {
  reason: string;
};

/** PO subset for invoice create selectors (`GET /purchase-orders`). */
export type InvoiceablePurchaseOrder = {
  id: string;
  purchaseOrderNumber: string;
  vendorId: string;
  projectId: string;
  status: string;
  items: Array<{
    id: string;
    materialId: string;
    materialCode: string | null;
    materialName: string | null;
    quantity: number;
    unit: MaterialUnit;
    rate: number;
    tax: number;
    receivedQuantity: number;
    balanceQuantity: number;
  }>;
};

/** GRN subset for invoice create selectors (`GET /goods-receipts`). */
export type InvoiceableGoodsReceipt = {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  vendorId: string;
  status: string;
  items: Array<{
    id: string;
    materialId: string;
    purchaseOrderLineId: string | null;
    acceptedQuantity: number | null;
    unit: MaterialUnit;
  }>;
};

export type VendorOption = {
  id: string;
  vendorCode: string;
  legalName: string;
};
