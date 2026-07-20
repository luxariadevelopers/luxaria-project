import type {
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '@luxaria/shared-types';

export type PurchaseListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PurchaseRequestRow = {
  id: string;
  requestNumber: string;
  projectId: string;
  requiredByDate: string;
  priority: string;
  status: PurchaseRequestStatus;
  estimatedTotal: number;
  createdAt?: string;
};

export type PurchaseOrderRow = {
  id: string;
  purchaseOrderNumber: string;
  projectId: string;
  vendorId: string;
  expectedDeliveryDate: string;
  status: PurchaseOrderStatus;
  total: number;
  balanceAmount: number;
  createdAt?: string;
};

export type VendorInvoiceRow = {
  id: string;
  documentNumber: string;
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  purchaseOrderId: string;
  dueDate: string;
  totalAmount: number;
  remainingPayable: number;
  matchingStatus: VendorInvoiceMatchingStatus;
  status: VendorInvoiceStatus;
  exceptionApproved: boolean;
  variances: Array<{
    type: string;
    severity: string;
    message?: string | null;
  }>;
};

export type PaginatedList<T> = {
  items: T[];
  meta: PurchaseListMeta | null;
};

export type PipelineCardModel = {
  id: string;
  title: string;
  count: number;
  amount: number | null;
  drillPath: string;
  drillLabel: string;
};

export type AgeingRow = {
  id: string;
  reference: string;
  status: string;
  dueDate: string;
  ageDays: number;
  amount: number;
  href: string;
};

export type VendorExceptionRow = {
  id: string;
  documentNumber: string;
  invoiceNumber: string;
  vendorId: string;
  matchingStatus: string;
  status: string;
  remainingPayable: number;
  varianceCount: number;
  exceptionApproved: boolean;
};
