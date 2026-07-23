import { apiGet } from '@/api/client';
import {
  CashAccountKind,
  type CashBalanceView,
  type PublicCashAccount,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseAccount(row: PublicCashAccount): PublicCashAccount {
  return {
    ...row,
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

/** `GET /cash-accounts?projectId=` — `cash.view` */
export async function fetchCashAccounts(params: {
  projectId: string;
  kind?: CashAccountKind;
  page?: number;
  limit?: number;
}): Promise<PublicCashAccount[]> {
  const res = await apiGet<PublicCashAccount[]>('/cash-accounts', {
    projectId: params.projectId,
    kind: params.kind,
    page: params.page ?? 1,
    limit: params.limit ?? 100,
  });
  return (res.data ?? []).map(normaliseAccount);
}

/** Petty-cash accounts for the selected project. */
export async function fetchPettyCashAccounts(
  projectId: string,
): Promise<PublicCashAccount[]> {
  return fetchCashAccounts({
    projectId,
    kind: CashAccountKind.PettyCash,
    limit: 100,
  });
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

/** Parallel balance fetch for BalanceCard. */
export async function fetchCashAccountBalances(
  ids: readonly string[],
): Promise<CashBalanceView[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const results = await Promise.allSettled(
    unique.map((id) => fetchCashAccountBalance(id)),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<CashBalanceView> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value);
}
