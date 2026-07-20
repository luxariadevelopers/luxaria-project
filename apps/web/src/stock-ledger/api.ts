import { apiGet } from '@/api/client';
import type {
  ListStockLedgerQuery,
  PaginatedStockLedger,
  PublicStockLedgerEntry,
  StockTransactionType,
} from './types';

const BASE = '/stock-ledger';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseEntry(row: PublicStockLedgerEntry): PublicStockLedgerEntry {
  return {
    ...row,
    id: String(row.id),
    transactionNumber: row.transactionNumber,
    projectId: String(row.projectId),
    materialId: String(row.materialId),
    transactionType: row.transactionType as StockTransactionType,
    quantityIn: Number(row.quantityIn ?? 0),
    quantityOut: Number(row.quantityOut ?? 0),
    unit: row.unit,
    baseUnitQuantity: Number(row.baseUnitQuantity ?? 0),
    baseUnit: row.baseUnit,
    referenceType: row.referenceType ?? '',
    referenceId: row.referenceId == null ? null : String(row.referenceId),
    transactionDate: toIso(row.transactionDate) ?? String(row.transactionDate),
    location: row.location ?? null,
    batch: row.batch ?? null,
    createdBy: String(row.createdBy),
    reversalOfId: row.reversalOfId == null ? null : String(row.reversalOfId),
    reversedById: row.reversedById == null ? null : String(row.reversedById),
    notes: row.notes ?? null,
    createdAt: toIso(row.createdAt) ?? undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedStockLedger['meta'] {
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

/** `GET /stock-ledger` — Nest `stock.view` */
export async function fetchStockLedger(
  query: ListStockLedgerQuery = {},
): Promise<PaginatedStockLedger> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicStockLedgerEntry[]>(BASE, {
    page,
    limit,
    sortOrder: query.sortOrder,
    search: query.search,
    projectId: query.projectId,
    materialId: query.materialId,
    transactionType: query.transactionType,
    location: query.location,
    batch: query.batch,
  });
  return {
    items: (res.data ?? []).map(normaliseEntry),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /stock-ledger/:id` — Nest `stock.view` */
export async function fetchStockLedgerEntry(
  id: string,
): Promise<PublicStockLedgerEntry> {
  const res = await apiGet<PublicStockLedgerEntry>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Stock ledger entry unavailable');
  }
  return normaliseEntry(res.data);
}
