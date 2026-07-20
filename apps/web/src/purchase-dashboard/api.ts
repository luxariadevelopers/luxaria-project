import {
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '@luxaria/shared-types';
import { apiGet } from '@/api/client';
import type {
  PaginatedList,
  PurchaseListMeta,
  PurchaseOrderRow,
  PurchaseRequestRow,
  VendorInvoiceRow,
} from './types';

function toIso(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value ?? '');
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PurchaseListMeta | null {
  if (!meta) {
    return null;
  }
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

function normalisePr(row: PurchaseRequestRow): PurchaseRequestRow {
  return {
    ...row,
    requiredByDate: toIso(row.requiredByDate),
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
  };
}

function normalisePo(row: PurchaseOrderRow): PurchaseOrderRow {
  return {
    ...row,
    expectedDeliveryDate: toIso(row.expectedDeliveryDate),
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
  };
}

function normaliseInvoice(row: VendorInvoiceRow): VendorInvoiceRow {
  return {
    ...row,
    dueDate: toIso(row.dueDate),
    variances: row.variances ?? [],
  };
}

/** `GET /purchase-requests` — `purchase.view` */
export async function fetchPurchaseRequests(query: {
  projectId: string;
  status?: PurchaseRequestStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedList<PurchaseRequestRow>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PurchaseRequestRow[]>('/purchase-requests', {
    projectId: query.projectId,
    status: query.status,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map(normalisePr),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /purchase-orders` — `purchase.view` */
export async function fetchPurchaseOrders(query: {
  projectId: string;
  status?: PurchaseOrderStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedList<PurchaseOrderRow>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PurchaseOrderRow[]>('/purchase-orders', {
    projectId: query.projectId,
    status: query.status,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map(normalisePo),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /vendor-invoices` — `vendor_invoice.view` */
export async function fetchVendorInvoices(query: {
  projectId: string;
  status?: VendorInvoiceStatus;
  matchingStatus?: VendorInvoiceMatchingStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedList<VendorInvoiceRow>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<VendorInvoiceRow[]>('/vendor-invoices', {
    projectId: query.projectId,
    status: query.status,
    matchingStatus: query.matchingStatus,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map(normaliseInvoice),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** Count helper — uses list `meta.total` (no dedicated count APIs). */
export async function fetchPurchaseRequestCount(
  projectId: string,
  status: PurchaseRequestStatus,
): Promise<number> {
  const result = await fetchPurchaseRequests({
    projectId,
    status,
    page: 1,
    limit: 1,
  });
  return result.meta?.total ?? result.items.length;
}

export async function fetchPurchaseOrderCount(
  projectId: string,
  status: PurchaseOrderStatus,
): Promise<number> {
  const result = await fetchPurchaseOrders({
    projectId,
    status,
    page: 1,
    limit: 1,
  });
  return result.meta?.total ?? result.items.length;
}

export {
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
};
