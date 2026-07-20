import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPost } from '@/api/client';
import type {
  CancelSiteExpenseInput,
  ListSiteExpenseVouchersQuery,
  PaginatedSiteExpenseVouchers,
  PublicSiteExpenseVoucher,
  RejectSiteExpenseInput,
  ReturnSiteExpenseInput,
} from './types';

const BASE = '/site-expense-vouchers';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  const iso = toIso(value);
  if (!iso) return '';
  return iso.slice(0, 10);
}

function normaliseVoucher(
  row: PublicSiteExpenseVoucher,
): PublicSiteExpenseVoucher {
  return {
    ...row,
    expenseDate: toDateOnly(row.expenseDate) || row.expenseDate,
    billDate: row.billDate ? toDateOnly(row.billDate) : null,
    submittedAt: toIso(row.submittedAt),
    verifiedAt: toIso(row.verifiedAt),
    approvedAt: toIso(row.approvedAt),
    postedAt: toIso(row.postedAt),
    rejectedAt: toIso(row.rejectedAt),
    cancelledAt: toIso(row.cancelledAt),
    warnings: row.warnings ?? [],
    attachments: row.attachments ?? [],
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedSiteExpenseVouchers['meta'] {
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

/** `GET /site-expense-vouchers` — `expense.view` */
export async function fetchSiteExpenseVouchers(
  query: ListSiteExpenseVouchersQuery = {},
): Promise<PaginatedSiteExpenseVouchers> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicSiteExpenseVoucher[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    pettyCashAccountId: query.pettyCashAccountId,
    expenseCategoryId: query.expenseCategoryId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseVoucher),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /site-expense-vouchers/:id` — `expense.view` */
export async function fetchSiteExpenseVoucher(
  id: string,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiGet<PublicSiteExpenseVoucher>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Expense voucher unavailable');
  }
  return normaliseVoucher(res.data);
}

/** `POST /site-expense-vouchers/:id/verify` — `expense.approve` */
export async function verifySiteExpenseVoucher(
  id: string,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/verify`);
  if (!res.data) {
    throw new Error(res.message || 'Verify failed');
  }
  return normaliseVoucher(res.data);
}

/** `POST /site-expense-vouchers/:id/approve` — `expense.approve` */
export async function approveSiteExpenseVoucher(
  id: string,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/approve`);
  if (!res.data) {
    throw new Error(res.message || 'Approve failed');
  }
  return normaliseVoucher(res.data);
}

/** `POST /site-expense-vouchers/:id/post` — `expense.post` */
export async function postSiteExpenseVoucher(
  id: string,
  idempotencyKey?: string,
): Promise<PublicSiteExpenseVoucher> {
  const { data } = await apiClient.post<ApiResponse<PublicSiteExpenseVoucher>>(
    `${BASE}/${id}/post`,
    {},
    idempotencyKey
      ? { headers: { 'Idempotency-Key': idempotencyKey } }
      : undefined,
  );
  if (!data.data) {
    throw new Error(data.message || 'Post failed');
  }
  return normaliseVoucher(data.data);
}

/** `POST /site-expense-vouchers/:id/reject` — `expense.approve` */
export async function rejectSiteExpenseVoucher(
  id: string,
  input: RejectSiteExpenseInput,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(
    `${BASE}/${id}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject failed');
  }
  return normaliseVoucher(res.data);
}

/** `POST /site-expense-vouchers/:id/return` — `expense.approve` */
export async function returnSiteExpenseVoucher(
  id: string,
  input: ReturnSiteExpenseInput = {},
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(
    `${BASE}/${id}/return`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Return failed');
  }
  return normaliseVoucher(res.data);
}

/** `POST /site-expense-vouchers/:id/cancel` — `expense.create` */
export async function cancelSiteExpenseVoucher(
  id: string,
  input: CancelSiteExpenseInput,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(
    `${BASE}/${id}/cancel`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel failed');
  }
  return normaliseVoucher(res.data);
}
