import {
  fetchCashAccountBalance as fetchCashAccountBalanceFromModule,
  fetchCashAccounts,
} from '@/cash-accounts/api';
import { CashAccountKind } from '@/cash-accounts/types';
import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CashBalanceView,
  CreatePettyCashRequirementInput,
  FinanceApproveInput,
  FundRequirementInput,
  ListPettyCashRequirementsQuery,
  PaginatedPettyCashRequirements,
  PublicCashAccount,
  PublicPettyCashRequirement,
  ReviewActionInput,
  UpdatePettyCashRequirementInput,
} from './types';

const BASE = '/petty-cash-requirements';

/**
 * `GET /cash-accounts?kind=petty_cash` — `cash.view`
 * Thin wrapper for the create form account picker (Phase 049).
 */
export async function fetchPettyCashAccounts(
  projectId: string,
): Promise<PublicCashAccount[]> {
  const res = await fetchCashAccounts({
    projectId,
    kind: CashAccountKind.PettyCash,
    limit: 100,
  });
  return res.items as PublicCashAccount[];
}

/** `GET /cash-accounts/:id/balance` — `cash.view` */
export async function fetchCashAccountBalance(
  id: string,
): Promise<CashBalanceView> {
  return (await fetchCashAccountBalanceFromModule(id)) as CashBalanceView;
}

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

function normaliseRequirement(
  row: PublicPettyCashRequirement,
): PublicPettyCashRequirement {
  return {
    ...row,
    weekStartDate: toDateOnly(row.weekStartDate) || row.weekStartDate,
    weekEndDate: toDateOnly(row.weekEndDate) || row.weekEndDate,
    projectManagerReviewedAt: toIso(row.projectManagerReviewedAt),
    financeReviewedAt: toIso(row.financeReviewedAt),
    fundedAt: toIso(row.fundedAt),
    closedAt: toIso(row.closedAt),
    warnings: row.warnings ?? [],
    previousUnsettledAmount: row.previousUnsettledAmount ?? 0,
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
): PaginatedPettyCashRequirements['meta'] {
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

/** `GET /petty-cash-requirements` — `petty_cash.view` */
export async function fetchPettyCashRequirements(
  query: ListPettyCashRequirementsQuery = {},
): Promise<PaginatedPettyCashRequirements> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicPettyCashRequirement[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    pettyCashAccountId: query.pettyCashAccountId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseRequirement),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /petty-cash-requirements/:id` — `petty_cash.view` */
export async function fetchPettyCashRequirement(
  id: string,
): Promise<PublicPettyCashRequirement> {
  const res = await apiGet<PublicPettyCashRequirement>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Requirement unavailable');
  }
  return normaliseRequirement(res.data);
}

/** `POST /petty-cash-requirements` — `petty_cash.request` */
export async function createPettyCashRequirement(
  input: CreatePettyCashRequirementInput,
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create requirement failed');
  }
  return normaliseRequirement(res.data);
}

/** `PATCH /petty-cash-requirements/:id` — `petty_cash.request` */
export async function updatePettyCashRequirement(
  id: string,
  input: UpdatePettyCashRequirementInput,
): Promise<PublicPettyCashRequirement> {
  const res = await apiPatch<PublicPettyCashRequirement>(
    `${BASE}/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update requirement failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/submit` — `petty_cash.request` */
export async function submitPettyCashRequirement(
  id: string,
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit requirement failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/project-manager-approve` — `petty_cash.approve` */
export async function projectManagerApproveRequirement(
  id: string,
  input: ReviewActionInput = {},
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/project-manager-approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'PM review failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/finance-approve` — `petty_cash.approve` */
export async function financeApproveRequirement(
  id: string,
  input: FinanceApproveInput = {},
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/finance-approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Finance approval failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/reject` — `petty_cash.approve` */
export async function rejectPettyCashRequirement(
  id: string,
  input: ReviewActionInput = {},
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject requirement failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/return` — `petty_cash.approve` */
export async function returnPettyCashRequirement(
  id: string,
  input: ReviewActionInput = {},
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/return`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Return requirement failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/fund` — `petty_cash.fund` */
export async function fundPettyCashRequirement(
  id: string,
  input: FundRequirementInput = {},
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/fund`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Fund requirement failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/close` — `petty_cash.fund` */
export async function closePettyCashRequirement(
  id: string,
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/close`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Close requirement failed');
  }
  return normaliseRequirement(res.data);
}

/** `POST …/:id/cancel` — `petty_cash.request` */
export async function cancelPettyCashRequirement(
  id: string,
): Promise<PublicPettyCashRequirement> {
  const res = await apiPost<PublicPettyCashRequirement>(
    `${BASE}/${id}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel requirement failed');
  }
  return normaliseRequirement(res.data);
}
