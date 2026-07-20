import { apiGet, apiPost } from '@/api/client';
import type {
  CashBalanceView,
  CloseCashAccountInput,
  ConfirmHandoverInput,
  CreateCashAccountInput,
  InitiateCustodianTransferInput,
  ListCashAccountsQuery,
  PaginatedCashAccounts,
  PublicCashAccount,
  PublicCustodianHandover,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseHandover(
  h: PublicCustodianHandover | null | undefined,
): PublicCustodianHandover | null {
  if (!h) return null;
  return {
    ...h,
    initiatedAt: toIso(h.initiatedAt) ?? String(h.initiatedAt),
    outgoingConfirmedAt: toIso(h.outgoingConfirmedAt),
    incomingConfirmedAt: toIso(h.incomingConfirmedAt),
  };
}

function normaliseCashAccount(row: PublicCashAccount): PublicCashAccount {
  return {
    ...row,
    pendingHandover: normaliseHandover(row.pendingHandover),
    closedAt: toIso(row.closedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function normaliseBalance(row: CashBalanceView): CashBalanceView {
  return {
    ...row,
    asOf: toIso(row.asOf) ?? String(row.asOf),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedCashAccounts['meta'] {
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

/** `GET /cash-accounts` — `cash.view` */
export async function fetchCashAccounts(
  query: ListCashAccountsQuery = {},
): Promise<PaginatedCashAccounts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCashAccount[]>('/cash-accounts', {
    page,
    limit,
    projectId: query.projectId,
    kind: query.kind,
    status: query.status,
    custodianUserId: query.custodianUserId,
  });
  return {
    items: (res.data ?? []).map(normaliseCashAccount),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /cash-accounts/:id` — `cash.view` */
export async function fetchCashAccount(id: string): Promise<PublicCashAccount> {
  const res = await apiGet<PublicCashAccount>(
    `/cash-accounts/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cash account unavailable');
  }
  return normaliseCashAccount(res.data);
}

/** `GET /cash-accounts/:id/balance` — `cash.view` */
export async function fetchCashAccountBalance(
  id: string,
): Promise<CashBalanceView> {
  const res = await apiGet<CashBalanceView>(
    `/cash-accounts/${encodeURIComponent(id)}/balance`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cash balance unavailable');
  }
  return normaliseBalance(res.data);
}

/** Parallel balance fetch for list balance cards / close preview. */
export async function fetchCashAccountBalances(
  ids: readonly string[],
): Promise<CashBalanceView[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  return Promise.all(unique.map((id) => fetchCashAccountBalance(id)));
}

/** `POST /cash-accounts` — `cash.manage` */
export async function createCashAccount(
  input: CreateCashAccountInput,
): Promise<PublicCashAccount> {
  const res = await apiPost<PublicCashAccount>('/cash-accounts', input);
  if (!res.data) {
    throw new Error(res.message || 'Create cash account failed');
  }
  return normaliseCashAccount(res.data);
}

/** `POST /cash-accounts/:id/transfer-custodian` — `cash.manage` */
export async function transferCustodian(
  id: string,
  input: InitiateCustodianTransferInput,
): Promise<PublicCashAccount> {
  const res = await apiPost<PublicCashAccount>(
    `/cash-accounts/${encodeURIComponent(id)}/transfer-custodian`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Custodian transfer failed');
  }
  return normaliseCashAccount(res.data);
}

/** `POST /cash-accounts/:id/confirm-handover` — `cash.view` */
export async function confirmHandover(
  id: string,
  input: ConfirmHandoverInput = {},
): Promise<PublicCashAccount> {
  const res = await apiPost<PublicCashAccount>(
    `/cash-accounts/${encodeURIComponent(id)}/confirm-handover`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Handover confirmation failed');
  }
  return normaliseCashAccount(res.data);
}

/** `POST /cash-accounts/:id/cancel-handover` — `cash.manage` */
export async function cancelHandover(id: string): Promise<PublicCashAccount> {
  const res = await apiPost<PublicCashAccount>(
    `/cash-accounts/${encodeURIComponent(id)}/cancel-handover`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel handover failed');
  }
  return normaliseCashAccount(res.data);
}

/** `POST /cash-accounts/:id/close` — `cash.manage` */
export async function closeCashAccount(
  id: string,
  input: CloseCashAccountInput = {},
): Promise<PublicCashAccount> {
  const res = await apiPost<PublicCashAccount>(
    `/cash-accounts/${encodeURIComponent(id)}/close`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Close cash account failed');
  }
  return normaliseCashAccount(res.data);
}

/** Minimal user row for custodian pickers — `GET /users` · `user.view`. */
export type CashAccountUserOption = {
  id: string;
  fullName: string;
  userCode: string;
  status: string;
};

export async function fetchActiveUsersForCash(
  projectId?: string,
): Promise<CashAccountUserOption[]> {
  const res = await apiGet<CashAccountUserOption[]>('/users', {
    page: 1,
    limit: 100,
    status: 'active',
    projectId: projectId || undefined,
  });
  return res.data ?? [];
}
