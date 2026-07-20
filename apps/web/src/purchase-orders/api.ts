import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  PaginatedPurchaseOrders,
  PurchaseOrderBalance,
  PublicPurchaseOrder,
  UpdatePurchaseOrderInput,
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

function normaliseAddress(
  address: PublicPurchaseOrder['billingAddress'],
): PublicPurchaseOrder['billingAddress'] {
  return {
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country ?? 'India',
  };
}

function normalisePo(row: PublicPurchaseOrder): PublicPurchaseOrder {
  return {
    ...row,
    orderDate: toDateOnly(row.orderDate),
    expectedDeliveryDate: toDateOnly(row.expectedDeliveryDate),
    issuedAt: toIso(row.issuedAt),
    pdfGeneratedAt: toIso(row.pdfGeneratedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    billingAddress: normaliseAddress(row.billingAddress),
    deliveryAddress: normaliseAddress(row.deliveryAddress),
    paymentTerms: row.paymentTerms ?? null,
    terms: row.terms ?? null,
    items: row.items ?? [],
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedPurchaseOrders['meta'] {
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

/** `GET /purchase-orders` — `purchase.view` */
export async function fetchPurchaseOrders(
  query: ListPurchaseOrdersQuery = {},
): Promise<PaginatedPurchaseOrders> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicPurchaseOrder[]>('/purchase-orders', {
    page,
    limit,
    search: query.search,
    projectId: query.projectId,
    purchaseRequestId: query.purchaseRequestId,
    vendorId: query.vendorId,
    status: query.status,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
  return {
    items: (res.data ?? []).map(normalisePo),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /purchase-orders/:id` — `purchase.view` */
export async function fetchPurchaseOrder(
  id: string,
): Promise<PublicPurchaseOrder> {
  const res = await apiGet<PublicPurchaseOrder>(`/purchase-orders/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Purchase order unavailable');
  }
  return normalisePo(res.data);
}

/** `GET /purchase-orders/:id/balance` — `purchase.view` */
export async function fetchPurchaseOrderBalance(
  id: string,
): Promise<PurchaseOrderBalance> {
  const res = await apiGet<PurchaseOrderBalance>(
    `/purchase-orders/${id}/balance`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Purchase order balance unavailable');
  }
  return res.data;
}

/** `POST /purchase-orders` — `purchase.order` (always starts as draft). */
export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
): Promise<PublicPurchaseOrder> {
  const res = await apiPost<PublicPurchaseOrder>('/purchase-orders', input);
  if (!res.data) {
    throw new Error(res.message || 'Create purchase order failed');
  }
  return normalisePo(res.data);
}

/** `PATCH /purchase-orders/:id` — `purchase.order` (draft only). */
export async function updatePurchaseOrder(
  id: string,
  input: UpdatePurchaseOrderInput,
): Promise<PublicPurchaseOrder> {
  const res = await apiPatch<PublicPurchaseOrder>(
    `/purchase-orders/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update purchase order failed');
  }
  return normalisePo(res.data);
}

/**
 * `POST /purchase-orders/:id/submit-approval` — `purchase.order`
 * (Nest catalog has no `purchase_order.submit`.)
 */
export async function submitPurchaseOrder(
  id: string,
): Promise<PublicPurchaseOrder> {
  const res = await apiPost<PublicPurchaseOrder>(
    `/purchase-orders/${id}/submit-approval`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit purchase order failed');
  }
  return normalisePo(res.data);
}

/** `POST /purchase-orders/:id/approve` — `purchase.approve` */
export async function approvePurchaseOrder(
  id: string,
  input: { comment?: string | null } = {},
): Promise<PublicPurchaseOrder> {
  const res = await apiPost<PublicPurchaseOrder>(
    `/purchase-orders/${id}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve purchase order failed');
  }
  return normalisePo(res.data);
}

/** `POST /purchase-orders/:id/reject` — `purchase.approve` */
export async function rejectPurchaseOrder(
  id: string,
  input: { reason: string },
): Promise<PublicPurchaseOrder> {
  const res = await apiPost<PublicPurchaseOrder>(
    `/purchase-orders/${id}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject purchase order failed');
  }
  return normalisePo(res.data);
}

/** `POST /purchase-orders/:id/revise` — `purchase.order` */
export async function revisePurchaseOrder(
  id: string,
  input: UpdatePurchaseOrderInput,
): Promise<PublicPurchaseOrder> {
  const res = await apiPost<PublicPurchaseOrder>(
    `/purchase-orders/${id}/revise`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Revise purchase order failed');
  }
  return normalisePo(res.data);
}

/** `POST /purchase-orders/:id/close` — `purchase.order` */
export async function closePurchaseOrder(
  id: string,
): Promise<PublicPurchaseOrder> {
  const res = await apiPost<PublicPurchaseOrder>(
    `/purchase-orders/${id}/close`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Close purchase order failed');
  }
  return normalisePo(res.data);
}

/** `POST /purchase-orders/:id/cancel` — `purchase.order` */
export async function cancelPurchaseOrder(
  id: string,
): Promise<PublicPurchaseOrder> {
  const res = await apiPost<PublicPurchaseOrder>(
    `/purchase-orders/${id}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel purchase order failed');
  }
  return normalisePo(res.data);
}
