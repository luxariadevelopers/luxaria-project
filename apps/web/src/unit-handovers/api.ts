import { apiGet } from '@/api/client';
import type {
  ListUnitHandoversQuery,
  PaginatedUnitHandovers,
  PublicUnitHandover,
  UnitHandoverListRow,
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
): PaginatedUnitHandovers['meta'] {
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

function toListRow(row: PublicUnitHandover): UnitHandoverListRow {
  return {
    id: row.id,
    handoverNumber: row.handoverNumber,
    projectId: row.projectId,
    customerId: row.customerId,
    unitId: row.unitId,
    status: row.status,
    scheduledAt: toIso(row.scheduledAt),
    completedAt: toIso(row.completedAt),
    keysHandedOver: row.keysHandedOver,
    customerAcknowledged: row.customerAcknowledged,
    createdAt: row.createdAt,
  };
}

/** `GET /unit-handovers` — `handover.view` */
export async function fetchUnitHandovers(
  query: ListUnitHandoversQuery = {},
): Promise<PaginatedUnitHandovers> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicUnitHandover[]>('/unit-handovers', {
    page,
    limit,
    projectId: query.projectId || undefined,
    bookingId: query.bookingId || undefined,
    customerId: query.customerId || undefined,
    unitId: query.unitId || undefined,
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
