import { GoodsReceiptStatus, PurchaseOrderStatus } from '@luxaria/shared-types';
import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ApproveVendorInvoiceInput,
  CreateVendorInvoiceInput,
  InvoiceableGoodsReceipt,
  InvoiceablePurchaseOrder,
  ListVendorInvoicesQuery,
  PaginatedVendorInvoices,
  PublicVendorInvoice,
  RejectMatchingInput,
  UpdateVendorInvoiceInput,
  VendorOption,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  const iso = toIso(value);
  if (!iso) return '';
  return iso.slice(0, 10);
}

function normaliseInvoice(row: PublicVendorInvoice): PublicVendorInvoice {
  return {
    ...row,
    invoiceDate: toDateOnly(row.invoiceDate) || row.invoiceDate,
    dueDate: toDateOnly(row.dueDate) || row.dueDate,
    exceptionApprovedAt: toIso(row.exceptionApprovedAt),
    matchingRejectedAt: toIso(row.matchingRejectedAt),
    submittedAt: toIso(row.submittedAt),
    verifiedAt: toIso(row.verifiedAt),
    matchedAt: toIso(row.matchedAt),
    approvedAt: toIso(row.approvedAt),
    postedAt: toIso(row.postedAt),
    paidAt: toIso(row.paidAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    items: (row.items ?? []).map((item) => ({ ...item })),
    variances: (row.variances ?? []).map((v) => ({ ...v })),
    grnIds: row.grnIds ?? [],
    paidAmount: Number(row.paidAmount ?? 0),
    remainingPayable: Number(row.remainingPayable ?? 0),
    exceptionApproved: Boolean(row.exceptionApproved),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedVendorInvoices['meta'] {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

/** `GET /vendor-invoices` — Nest `vendor_invoice.view` */
export async function fetchVendorInvoices(
  query: ListVendorInvoicesQuery = {},
): Promise<PaginatedVendorInvoices> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicVendorInvoice[]>('/vendor-invoices', {
    page,
    limit,
    search: query.search,
    projectId: query.projectId,
    vendorId: query.vendorId,
    purchaseOrderId: query.purchaseOrderId,
    status: query.status,
    matchingStatus: query.matchingStatus,
  });
  return {
    items: (res.data ?? []).map(normaliseInvoice),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /vendor-invoices/:id` — Nest `vendor_invoice.view` */
export async function fetchVendorInvoice(
  id: string,
): Promise<PublicVendorInvoice> {
  const res = await apiGet<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice unavailable');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices` — Nest `vendor_invoice.create` */
export async function createVendorInvoice(
  input: CreateVendorInvoiceInput,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>('/vendor-invoices', input);
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice create failed');
  }
  return normaliseInvoice(res.data);
}

/** `PATCH /vendor-invoices/:id` — Nest `vendor_invoice.create` */
export async function updateVendorInvoice(
  id: string,
  input: UpdateVendorInvoiceInput,
): Promise<PublicVendorInvoice> {
  const res = await apiPatch<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice update failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/submit` — Nest `vendor_invoice.create` */
export async function submitVendorInvoice(
  id: string,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice submit failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/verify` — Nest `vendor_invoice.verify` */
export async function verifyVendorInvoice(
  id: string,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/verify`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice verify failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/match` — Nest `vendor_invoice.match` */
export async function matchVendorInvoice(
  id: string,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/match`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Three-way match failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/reject-matching` — Nest `vendor_invoice.match` */
export async function rejectVendorInvoiceMatching(
  id: string,
  input: RejectMatchingInput,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/reject-matching`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject matching failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/approve` — Nest `vendor_invoice.approve` */
export async function approveVendorInvoice(
  id: string,
  input: ApproveVendorInvoiceInput = {},
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice approve failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/post` — Nest `vendor_invoice.post` */
export async function postVendorInvoice(
  id: string,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/post`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice post failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/mark-paid` — Nest `payment.release` */
export async function markVendorInvoicePaid(
  id: string,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/mark-paid`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Mark paid failed');
  }
  return normaliseInvoice(res.data);
}

/** `POST /vendor-invoices/:id/cancel` — Nest `vendor_invoice.create` */
export async function cancelVendorInvoice(
  id: string,
): Promise<PublicVendorInvoice> {
  const res = await apiPost<PublicVendorInvoice>(
    `/vendor-invoices/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor invoice cancel failed');
  }
  return normaliseInvoice(res.data);
}

const INVOICEABLE_PO_STATUSES = [
  PurchaseOrderStatus.Issued,
  PurchaseOrderStatus.PartiallyReceived,
  PurchaseOrderStatus.FullyReceived,
  PurchaseOrderStatus.Closed,
] as const;

/**
 * Open / receivable POs for invoice create.
 * Nest `requireOpenPo` — issued, partially_received, fully_received, closed.
 * Uses `GET /purchase-orders` (`purchase.view`).
 */
export async function fetchInvoiceablePurchaseOrders(input: {
  projectId: string;
  vendorId?: string;
}): Promise<InvoiceablePurchaseOrder[]> {
  const rows: InvoiceablePurchaseOrder[] = [];
  for (const status of INVOICEABLE_PO_STATUSES) {
    const res = await apiGet<InvoiceablePurchaseOrder[]>('/purchase-orders', {
      page: 1,
      limit: 100,
      projectId: input.projectId,
      vendorId: input.vendorId,
      status,
    });
    for (const row of res.data ?? []) {
      rows.push({
        ...row,
        items: (row.items ?? []).map((item) => ({
          ...item,
          materialCode: item.materialCode ?? null,
          materialName: item.materialName ?? null,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          tax: Number(item.tax ?? 0),
          receivedQuantity: Number(item.receivedQuantity ?? 0),
          balanceQuantity: Number(item.balanceQuantity ?? 0),
        })),
      });
    }
  }
  rows.sort((a, b) =>
    a.purchaseOrderNumber.localeCompare(b.purchaseOrderNumber),
  );
  return rows;
}

const INVOICEABLE_GRN_STATUSES = new Set<string>([
  GoodsReceiptStatus.Accepted,
  GoodsReceiptStatus.PartiallyAccepted,
  GoodsReceiptStatus.Posted,
]);

/**
 * Accepted / posted GRNs for a PO.
 * Nest `POSTABLE_GRN_STATUSES`. Uses `GET /goods-receipts` (`grn.create`).
 */
export async function fetchInvoiceableGoodsReceipts(input: {
  projectId: string;
  purchaseOrderId: string;
  vendorId?: string;
}): Promise<InvoiceableGoodsReceipt[]> {
  const res = await apiGet<InvoiceableGoodsReceipt[]>('/goods-receipts', {
    page: 1,
    limit: 100,
    projectId: input.projectId,
    purchaseOrderId: input.purchaseOrderId,
    vendorId: input.vendorId,
  });
  return (res.data ?? [])
    .filter((row) => INVOICEABLE_GRN_STATUSES.has(row.status))
    .map((row) => ({
      ...row,
      items: (row.items ?? []).map((item) => ({
        ...item,
        acceptedQuantity:
          item.acceptedQuantity == null
            ? null
            : Number(item.acceptedQuantity),
      })),
    }));
}

/** `GET /purchase-orders/:id` — Nest `purchase.view` */
export async function fetchPurchaseOrderForInvoice(
  id: string,
): Promise<InvoiceablePurchaseOrder> {
  const res = await apiGet<InvoiceablePurchaseOrder>(
    `/purchase-orders/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Purchase order unavailable');
  }
  return {
    ...res.data,
    items: (res.data.items ?? []).map((item) => ({
      ...item,
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      tax: Number(item.tax ?? 0),
      receivedQuantity: Number(item.receivedQuantity ?? 0),
      balanceQuantity: Number(item.balanceQuantity ?? 0),
    })),
  };
}

/** `GET /vendors?search=` — Nest `vendor.view` */
export async function searchVendorOptions(
  search = '',
  limit = 50,
): Promise<VendorOption[]> {
  const res = await apiGet<VendorOption[]>('/vendors', {
    page: 1,
    limit,
    search: search.trim() || undefined,
  });
  return (res.data ?? []).map((v) => ({
    id: v.id,
    vendorCode: v.vendorCode,
    legalName: v.legalName,
  }));
}
