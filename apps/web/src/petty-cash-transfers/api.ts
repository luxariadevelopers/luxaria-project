import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import {
  FundableRequirementStatus,
  type ApprovedRequestBalance,
  type BankAccountOption,
  type CancelPettyCashFundTransferInput,
  type CreatePettyCashFundTransferInput,
  type FundablePettyCashRequirement,
  type ListPettyCashFundTransfersQuery,
  type PaginatedPettyCashFundTransfers,
  type PublicPettyCashFundTransfer,
  type UpdatePettyCashFundTransferInput,
} from './types';

const BASE = '/petty-cash-fund-transfers';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseTransfer(
  row: PublicPettyCashFundTransfer,
): PublicPettyCashFundTransfer {
  return {
    ...row,
    transferDate: toIso(row.transferDate) ?? row.transferDate,
    verifiedAt: toIso(row.verifiedAt),
    postedAt: toIso(row.postedAt),
    cancelledAt: toIso(row.cancelledAt),
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
): PaginatedPettyCashFundTransfers['meta'] {
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

/** `GET /petty-cash-fund-transfers` — `petty_cash.view` */
export async function fetchPettyCashFundTransfers(
  query: ListPettyCashFundTransfersQuery = {},
): Promise<PaginatedPettyCashFundTransfers> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicPettyCashFundTransfer[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    requestId: query.requestId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseTransfer),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /petty-cash-fund-transfers/:id` — `petty_cash.view` */
export async function fetchPettyCashFundTransfer(
  id: string,
): Promise<PublicPettyCashFundTransfer> {
  const res = await apiGet<PublicPettyCashFundTransfer>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Fund transfer unavailable');
  }
  return normaliseTransfer(res.data);
}

/**
 * `GET /petty-cash-fund-transfers/request/:requestId/balance`
 * — `petty_cash.view`
 */
export async function fetchApprovedRequestBalance(
  requestId: string,
): Promise<ApprovedRequestBalance> {
  const res = await apiGet<ApprovedRequestBalance>(
    `${BASE}/request/${encodeURIComponent(requestId)}/balance`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approved balance unavailable');
  }
  return res.data;
}

/**
 * `POST /petty-cash-fund-transfers` — `petty_cash.fund`
 * Optional `Idempotency-Key`.
 */
export async function createPettyCashFundTransfer(
  input: CreatePettyCashFundTransferInput,
  idempotencyKey?: string,
): Promise<PublicPettyCashFundTransfer> {
  const { data } = await apiClient.post<
    ApiResponse<PublicPettyCashFundTransfer>
  >(
    BASE,
    input,
    idempotencyKey
      ? { headers: { 'Idempotency-Key': idempotencyKey } }
      : undefined,
  );
  if (!data.data) {
    throw new Error(data.message || 'Create fund transfer failed');
  }
  return normaliseTransfer(data.data);
}

/** `PATCH /petty-cash-fund-transfers/:id` — `petty_cash.fund` */
export async function updatePettyCashFundTransfer(
  id: string,
  input: UpdatePettyCashFundTransferInput,
): Promise<PublicPettyCashFundTransfer> {
  const res = await apiPatch<PublicPettyCashFundTransfer>(
    `${BASE}/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update fund transfer failed');
  }
  return normaliseTransfer(res.data);
}

/** `POST …/:id/verify` — `petty_cash.fund` */
export async function verifyPettyCashFundTransfer(
  id: string,
): Promise<PublicPettyCashFundTransfer> {
  const res = await apiPost<PublicPettyCashFundTransfer>(`${BASE}/${id}/verify`);
  if (!res.data) {
    throw new Error(res.message || 'Verify fund transfer failed');
  }
  return normaliseTransfer(res.data);
}

/**
 * `POST …/:id/post` — `petty_cash.fund`
 * Optional `Idempotency-Key` (defaults server-side to `pcft-post:<id>`).
 */
export async function postPettyCashFundTransfer(
  id: string,
  idempotencyKey?: string,
): Promise<PublicPettyCashFundTransfer> {
  const { data } = await apiClient.post<
    ApiResponse<PublicPettyCashFundTransfer>
  >(
    `${BASE}/${id}/post`,
    undefined,
    idempotencyKey
      ? { headers: { 'Idempotency-Key': idempotencyKey } }
      : undefined,
  );
  if (!data.data) {
    throw new Error(data.message || 'Post fund transfer failed');
  }
  return normaliseTransfer(data.data);
}

/** `POST …/:id/cancel` — `petty_cash.fund` */
export async function cancelPettyCashFundTransfer(
  id: string,
  input: CancelPettyCashFundTransferInput,
): Promise<PublicPettyCashFundTransfer> {
  const res = await apiPost<PublicPettyCashFundTransfer>(
    `${BASE}/${id}/cancel`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel fund transfer failed');
  }
  return normaliseTransfer(res.data);
}

/**
 * Fundable weekly requirements for the transfer form.
 * Nest allows fund transfers only when status is `approved` or `funded`.
 */
export async function fetchFundablePettyCashRequirements(
  projectId: string,
): Promise<FundablePettyCashRequirement[]> {
  const statuses = [
    FundableRequirementStatus.Approved,
    FundableRequirementStatus.Funded,
  ] as const;

  const pages = await Promise.all(
    statuses.map((status) =>
      apiGet<FundablePettyCashRequirement[]>('/petty-cash-requirements', {
        projectId,
        status,
        page: 1,
        limit: 100,
      }),
    ),
  );

  const byId = new Map<string, FundablePettyCashRequirement>();
  for (const res of pages) {
    for (const row of res.data ?? []) {
      byId.set(row.id, {
        ...row,
        weekStartDate: toIso(row.weekStartDate) ?? undefined,
        weekEndDate: toIso(row.weekEndDate) ?? undefined,
      });
    }
  }
  return [...byId.values()];
}

/**
 * `GET /company-bank-accounts` — `bank.view` (source bank selector).
 */
export async function fetchBankAccountOptions(
  projectId?: string,
): Promise<BankAccountOption[]> {
  const res = await apiGet<
    Array<{
      id: string;
      accountCode: string;
      bankName: string;
      maskedAccountNumber: string;
    }>
  >('/company-bank-accounts', {
    limit: 100,
    projectId,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    label: `${row.bankName} · ${row.accountCode} · ${row.maskedAccountNumber}`,
  }));
}
