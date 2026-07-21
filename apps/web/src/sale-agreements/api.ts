import { apiGet } from '@/api/client';
import type {
  ListSaleAgreementsQuery,
  PaginatedSaleAgreements,
  PublicSaleAgreement,
  SaleAgreementListRow,
} from './types';

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedSaleAgreements['meta'] {
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

function toListRow(row: PublicSaleAgreement): SaleAgreementListRow {
  return {
    id: row.id,
    agreementNumber: row.agreementNumber,
    projectId: row.projectId,
    bookingId: row.bookingId,
    customerId: row.customerId,
    unitId: row.unitId,
    status: row.status,
    agreementValue: row.agreementValue,
    createdAt: row.createdAt,
  };
}

/** `GET /sale-agreements` — `agreement.view` */
export async function fetchSaleAgreements(
  query: ListSaleAgreementsQuery = {},
): Promise<PaginatedSaleAgreements> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicSaleAgreement[]>('/sale-agreements', {
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
