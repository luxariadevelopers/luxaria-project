import { apiGet, apiPost } from '@/api/client';
import type {
  ListGoodsReceiptsQuery,
  PaginatedGoodsReceipts,
  PublicGoodsReceipt,
  PurchaseOrderForCompare,
  QualityAcceptInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseGrn(row: PublicGoodsReceipt): PublicGoodsReceipt {
  return {
    ...row,
    receivedDate: toIso(row.receivedDate) ?? row.receivedDate,
    qualityCheckedAt: toIso(row.qualityCheckedAt),
    postedAt: toIso(row.postedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    photos: row.photos ?? [],
    items: (row.items ?? []).map((item) => ({
      ...item,
      acceptedQuantity: item.acceptedQuantity ?? null,
      rejectedQuantity: item.rejectedQuantity ?? null,
      rejectionReason: item.rejectionReason ?? null,
      purchaseOrderLineId: item.purchaseOrderLineId ?? null,
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
    })),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedGoodsReceipts['meta'] {
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

/** `GET /goods-receipts` — Nest `grn.create` */
export async function fetchGoodsReceipts(
  query: ListGoodsReceiptsQuery = {},
): Promise<PaginatedGoodsReceipts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicGoodsReceipt[]>('/goods-receipts', {
    page,
    limit,
    search: query.search,
    projectId: query.projectId,
    purchaseOrderId: query.purchaseOrderId,
    vendorId: query.vendorId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseGrn),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /goods-receipts/:id` — Nest `grn.create` */
export async function fetchGoodsReceipt(
  id: string,
): Promise<PublicGoodsReceipt> {
  const res = await apiGet<PublicGoodsReceipt>(
    `/goods-receipts/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Goods receipt unavailable');
  }
  return normaliseGrn(res.data);
}

/** `POST /goods-receipts/:id/quality-check` — Nest `grn.approve` */
export async function startGrnQualityCheck(
  id: string,
): Promise<PublicGoodsReceipt> {
  const res = await apiPost<PublicGoodsReceipt>(
    `/goods-receipts/${encodeURIComponent(id)}/quality-check`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Quality check failed');
  }
  return normaliseGrn(res.data);
}

/** `POST /goods-receipts/:id/accept` — Nest `grn.approve` */
export async function acceptGoodsReceipt(
  id: string,
  input: QualityAcceptInput,
): Promise<PublicGoodsReceipt> {
  const res = await apiPost<PublicGoodsReceipt>(
    `/goods-receipts/${encodeURIComponent(id)}/accept`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Accept goods receipt failed');
  }
  return normaliseGrn(res.data);
}

/** `POST /goods-receipts/:id/post` — Nest `grn.approve` */
export async function postGoodsReceipt(
  id: string,
): Promise<PublicGoodsReceipt> {
  const res = await apiPost<PublicGoodsReceipt>(
    `/goods-receipts/${encodeURIComponent(id)}/post`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Post goods receipt failed');
  }
  return normaliseGrn(res.data);
}

/**
 * `GET /purchase-orders/:id` — Nest `purchase.view`
 * Used only for side-by-side PO comparison on the GRN detail page.
 */
export async function fetchPurchaseOrderForCompare(
  id: string,
): Promise<PurchaseOrderForCompare> {
  const res = await apiGet<PurchaseOrderForCompare>(
    `/purchase-orders/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Purchase order unavailable');
  }
  return {
    ...res.data,
    items: (res.data.items ?? []).map((line) => ({
      ...line,
      materialCode: line.materialCode ?? null,
      materialName: line.materialName ?? null,
    })),
  };
}
