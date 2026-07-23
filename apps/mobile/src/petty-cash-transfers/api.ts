import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPost } from '@/api/client';
import type {
  CancelPettyCashFundTransferInput,
  ListPettyCashFundTransfersQuery,
  PaginatedPettyCashFundTransfers,
  PublicPettyCashFundTransfer,
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
  const limit = query.limit ?? 50;
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
  const res = await apiGet<PublicPettyCashFundTransfer>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Fund transfer unavailable');
  }
  return normaliseTransfer(res.data);
}

/**
 * Acknowledge (phase prompt) → Nest verify.
 * `POST /petty-cash-fund-transfers/:id/verify` — `petty_cash.fund`
 */
export async function acknowledgePettyCashFundTransfer(
  id: string,
): Promise<PublicPettyCashFundTransfer> {
  return verifyPettyCashFundTransfer(id);
}

/** `POST …/:id/verify` — `petty_cash.fund` */
export async function verifyPettyCashFundTransfer(
  id: string,
): Promise<PublicPettyCashFundTransfer> {
  const res = await apiPost<PublicPettyCashFundTransfer>(
    `${BASE}/${encodeURIComponent(id)}/verify`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Acknowledge / verify failed');
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
    `${BASE}/${encodeURIComponent(id)}/post`,
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
    `${BASE}/${encodeURIComponent(id)}/cancel`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel fund transfer failed');
  }
  return normaliseTransfer(res.data);
}
