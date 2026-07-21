import { apiGet } from '@/api/client';
import type {
  CostCentreListRow,
  ListCostCentresQuery,
  PaginatedCostCentres,
  PublicCostCentre,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedCostCentres['meta'] {
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

function toListRow(row: PublicCostCentre): CostCentreListRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    projectId: row.projectId,
    status: row.status,
    createdAt: row.createdAt,
  };
}

function normalise(row: PublicCostCentre): PublicCostCentre {
  return {
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** `GET /cost-centres` — `cost_centre.view` */
export async function fetchCostCentres(
  query: ListCostCentresQuery = {},
): Promise<PaginatedCostCentres> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCostCentre[]>('/cost-centres', {
    page,
    limit,
    search: query.search || undefined,
    companyId: query.companyId || undefined,
    projectId: query.projectId || undefined,
    kind: query.kind || undefined,
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
