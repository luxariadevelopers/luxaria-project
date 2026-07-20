import { apiGet, apiPost } from '@/api/client';
import type {
  CreateStockCountInput,
  ListStockCountsQuery,
  MaterialUnit,
  PaginatedStockCounts,
  PublicStockCount,
  StockForecastRow,
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

/** `POST /stock-counts` — Nest `stock.adjust` (draft) */
export async function createStockCount(
  input: CreateStockCountInput,
): Promise<PublicStockCount> {
  const res = await apiPost<PublicStockCount>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create stock count failed');
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

type ForecastApiRow = {
  projectId: string;
  materialId: string;
  materialCode?: string | null;
  materialName?: string | null;
  baseUnit: MaterialUnit;
  availableStock?: number;
};

/**
 * `GET /stock-reorder/forecast` — Nest `stock.view`
 * Seeds large count lists with system qty (sum across locations).
 */
export async function fetchStockForecastForCount(input: {
  projectId: string;
}): Promise<StockForecastRow[]> {
  const res = await apiGet<ForecastApiRow[]>('/stock-reorder/forecast', {
    projectId: input.projectId,
  });
  return (res.data ?? []).map((row: ForecastApiRow) => ({
    projectId: String(row.projectId),
    materialId: String(row.materialId),
    materialCode: row.materialCode ?? null,
    materialName: row.materialName ?? null,
    baseUnit: row.baseUnit,
    availableStock: Number(row.availableStock ?? 0),
  }));
}

/** `GET /stock-ledger/balance` — Nest `stock.view` (location-scoped). */
export async function fetchStockBalance(input: {
  projectId: string;
  materialId: string;
  location?: string;
}): Promise<{ quantityInBaseUnit: number; baseUnit: MaterialUnit }> {
  const res = await apiGet<{
    quantityInBaseUnit: number;
    baseUnit: MaterialUnit;
  }>('/stock-ledger/balance', {
    projectId: input.projectId,
    materialId: input.materialId,
    location: input.location || undefined,
  });
  if (!res.data) {
    throw new Error(res.message || 'Stock balance unavailable');
  }
  return {
    quantityInBaseUnit: Number(res.data.quantityInBaseUnit ?? 0),
    baseUnit: res.data.baseUnit,
  };
}
