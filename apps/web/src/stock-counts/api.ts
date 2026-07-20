import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ApproveStockCountInput,
  CreateStockCountInput,
  ListStockCountsQuery,
  PaginatedStockCounts,
  PublicStockCount,
  UpdateStockCountInput,
} from './types';

const BASE = '/stock-counts';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseCount(row: PublicStockCount): PublicStockCount {
  return {
    ...row,
    id: String(row.id),
    countNumber: row.countNumber,
    projectId: String(row.projectId),
    countDate: toIso(row.countDate) ?? String(row.countDate),
    countedBy: String(row.countedBy),
    location: row.location ?? '',
    items: (row.items ?? []).map((item) => ({
      ...item,
      id: item.id ? String(item.id) : '',
      materialId: String(item.materialId),
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
      systemQuantity: Number(item.systemQuantity ?? 0),
      physicalQuantity: Number(item.physicalQuantity ?? 0),
      difference: Number(item.difference ?? 0),
      reason: item.reason ?? null,
      photo: item.photo ?? null,
      isLargeVariance: Boolean(item.isLargeVariance),
      stockLedgerEntryId:
        item.stockLedgerEntryId == null
          ? null
          : String(item.stockLedgerEntryId),
    })),
    status: row.status,
    requiresDirectorApproval: Boolean(row.requiresDirectorApproval),
    notes: row.notes ?? null,
    reviewedBy: row.reviewedBy == null ? null : String(row.reviewedBy),
    reviewedAt: toIso(row.reviewedAt),
    approvedBy: row.approvedBy == null ? null : String(row.approvedBy),
    approvedAt: toIso(row.approvedAt),
    postedBy: row.postedBy == null ? null : String(row.postedBy),
    postedAt: toIso(row.postedAt),
    journalEntryId:
      row.journalEntryId == null ? null : String(row.journalEntryId),
    journalSkippedReason: row.journalSkippedReason ?? null,
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedStockCounts['meta'] {
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

/** `GET /stock-counts` — Nest `stock.view` */
export async function fetchStockCounts(
  query: ListStockCountsQuery = {},
): Promise<PaginatedStockCounts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicStockCount[]>(BASE, {
    page,
    limit,
    sortOrder: query.sortOrder,
    search: query.search,
    projectId: query.projectId,
    status: query.status,
    location: query.location,
  });
  return {
    items: (res.data ?? []).map(normaliseCount),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /stock-counts/:id` — Nest `stock.view` */
export async function fetchStockCount(id: string): Promise<PublicStockCount> {
  const res = await apiGet<PublicStockCount>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Stock count unavailable');
  }
  return normaliseCount(res.data);
}

/** `POST /stock-counts` — Nest `stock.adjust` */
export async function createStockCount(
  input: CreateStockCountInput,
): Promise<PublicStockCount> {
  const res = await apiPost<PublicStockCount>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create stock count failed');
  }
  return normaliseCount(res.data);
}

/** `PATCH /stock-counts/:id` — Nest `stock.adjust` */
export async function updateStockCount(
  id: string,
  input: UpdateStockCountInput,
): Promise<PublicStockCount> {
  const res = await apiPatch<PublicStockCount>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update stock count failed');
  }
  return normaliseCount(res.data);
}

/** `POST /stock-counts/:id/submit` — Nest `stock.adjust` */
export async function submitStockCount(id: string): Promise<PublicStockCount> {
  const res = await apiPost<PublicStockCount>(
    `${BASE}/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit stock count failed');
  }
  return normaliseCount(res.data);
}

/** `POST /stock-counts/:id/review` — Nest `stock.adjust` */
export async function reviewStockCount(id: string): Promise<PublicStockCount> {
  const res = await apiPost<PublicStockCount>(
    `${BASE}/${encodeURIComponent(id)}/review`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Review stock count failed');
  }
  return normaliseCount(res.data);
}

/**
 * `POST /stock-counts/:id/approve` — Nest route gate `stock.view`;
 * service requires `stock.adjust` or `stock.count.director_approve`.
 */
export async function approveStockCount(
  id: string,
  input: ApproveStockCountInput = {},
): Promise<PublicStockCount> {
  const res = await apiPost<PublicStockCount>(
    `${BASE}/${encodeURIComponent(id)}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve stock count failed');
  }
  return normaliseCount(res.data);
}

/** `POST /stock-counts/:id/post` — Nest `stock.adjust` */
export async function postStockCount(id: string): Promise<PublicStockCount> {
  const res = await apiPost<PublicStockCount>(
    `${BASE}/${encodeURIComponent(id)}/post`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Post stock count failed');
  }
  return normaliseCount(res.data);
}

/** `POST /stock-counts/:id/cancel` — Nest `stock.adjust` */
export async function cancelStockCount(id: string): Promise<PublicStockCount> {
  const res = await apiPost<PublicStockCount>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel stock count failed');
  }
  return normaliseCount(res.data);
}
