import { apiGet } from '@/api/client';
import type {
  ListOpeningBalancePacksQuery,
  OpeningBalanceListRow,
  PaginatedOpeningBalancePacks,
  PublicOpeningBalancePack,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedOpeningBalancePacks['meta'] {
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

function toListRow(row: PublicOpeningBalancePack): OpeningBalanceListRow {
  return {
    id: row.id,
    packNumber: row.packNumber,
    financialYearId: row.financialYearId,
    projectId: row.projectId,
    status: row.status,
    totalDebit: row.totalDebit,
    totalCredit: row.totalCredit,
    postedAt: row.postedAt,
    createdAt: row.createdAt,
  };
}

function normalise(row: PublicOpeningBalancePack): PublicOpeningBalancePack {
  return {
    ...row,
    postedAt: toIso(row.postedAt),
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

/** `GET /opening-balances` — `opening_balance.view` */
export async function fetchOpeningBalancePacks(
  query: ListOpeningBalancePacksQuery = {},
): Promise<PaginatedOpeningBalancePacks> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicOpeningBalancePack[]>('/opening-balances', {
    page,
    limit,
    search: query.search || undefined,
    companyId: query.companyId || undefined,
    financialYearId: query.financialYearId || undefined,
    projectId: query.projectId || undefined,
    status: query.status || undefined,
  });
  return {
    items: (res.data ?? []).map((row) => toListRow(normalise(row))),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}
