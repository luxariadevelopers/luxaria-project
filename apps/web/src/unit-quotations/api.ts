import { apiGet } from '@/api/client';
import type {
  ListUnitQuotationsQuery,
  PaginatedUnitQuotations,
  PublicUnitQuotation,
  UnitQuotationListRow,
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
): PaginatedUnitQuotations['meta'] {
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

function normalise(row: PublicUnitQuotation): PublicUnitQuotation {
  return {
    ...row,
    validUntil: toIso(row.validUntil),
    createdAt: toIso(row.createdAt) ?? undefined,
  };
}

function toListRow(row: PublicUnitQuotation): UnitQuotationListRow {
  const n = normalise(row);
  return {
    id: n.id,
    quotationNumber: n.quotationNumber,
    projectId: n.projectId,
    unitId: n.unitId,
    customerId: n.customerId,
    status: n.status,
    validUntil: n.validUntil,
    totals: n.totals,
    createdAt: n.createdAt,
  };
}

/** `GET /unit-quotations` — `quotation.view` */
export async function fetchUnitQuotations(
  query: ListUnitQuotationsQuery = {},
): Promise<PaginatedUnitQuotations> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicUnitQuotation[]>('/unit-quotations', {
    page,
    limit,
    projectId: query.projectId || undefined,
    unitId: query.unitId || undefined,
    customerId: query.customerId || undefined,
    status: query.status || undefined,
  });
  return {
    items: (res.data ?? []).map(toListRow),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}
