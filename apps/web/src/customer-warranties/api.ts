import { apiGet } from '@/api/client';
import type {
  CustomerWarrantyListRow,
  ListCustomerWarrantiesQuery,
  PaginatedCustomerWarranties,
  PublicCustomerWarranty,
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
): PaginatedCustomerWarranties['meta'] {
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

function toListRow(row: PublicCustomerWarranty): CustomerWarrantyListRow {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    projectId: row.projectId,
    customerId: row.customerId,
    unitId: row.unitId,
    category: row.category,
    description: row.description,
    status: row.status,
    raisedAt: toIso(row.raisedAt) ?? '',
    closedAt: toIso(row.closedAt),
    createdAt: row.createdAt,
  };
}

/** `GET /customer-warranties` — `warranty.view` */
export async function fetchCustomerWarranties(
  query: ListCustomerWarrantiesQuery = {},
): Promise<PaginatedCustomerWarranties> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCustomerWarranty[]>('/customer-warranties', {
    page,
    limit,
    projectId: query.projectId || undefined,
    bookingId: query.bookingId || undefined,
    customerId: query.customerId || undefined,
    unitId: query.unitId || undefined,
    status: query.status || undefined,
    category: query.category || undefined,
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
