import { apiGet } from '@/api/client';
import type {
  CustomerLoanListRow,
  ListCustomerLoansQuery,
  PaginatedCustomerLoans,
  PublicCustomerLoan,
} from './types';

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedCustomerLoans['meta'] {
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

function toListRow(row: PublicCustomerLoan): CustomerLoanListRow {
  return {
    id: row.id,
    loanNumber: row.loanNumber,
    projectId: row.projectId,
    customerId: row.customerId,
    unitId: row.unitId,
    bankName: row.bankName,
    status: row.status,
    sanctionAmount: row.sanctionAmount,
    totalDisbursed: row.totalDisbursed,
    createdAt: row.createdAt,
  };
}

/** `GET /customer-loans` — `loan.view` */
export async function fetchCustomerLoans(
  query: ListCustomerLoansQuery = {},
): Promise<PaginatedCustomerLoans> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCustomerLoan[]>('/customer-loans', {
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
