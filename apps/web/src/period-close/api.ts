import { apiGet, apiPost } from '@/api/client';
import type {
  ApprovePeriodReopenInput,
  ApproveReopenResult,
  CreateAccountingPeriodInput,
  ListAccountingPeriodsQuery,
  PeriodChecklistPayload,
  PreCloseValidationResult,
  PublicAccountingPeriod,
  PublicPeriodReopenRequest,
  RejectPeriodReopenInput,
  RequestPeriodReopenInput,
} from './types';

const BASE = '/accounting-period-closure';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseChecklistItem(
  item: PublicAccountingPeriod['checklist'][number],
): PublicAccountingPeriod['checklist'][number] {
  return {
    ...item,
    issueCount: Number(item.issueCount ?? 0),
    issues: item.issues ?? [],
    checkedAt: toIso(item.checkedAt),
  };
}

function normalisePeriod(row: PublicAccountingPeriod): PublicAccountingPeriod {
  return {
    ...row,
    periodFrom: toIso(row.periodFrom) ?? row.periodFrom,
    periodTo: toIso(row.periodTo) ?? row.periodTo,
    validationRunAt: toIso(row.validationRunAt),
    lockedAt: toIso(row.lockedAt),
    closedAt: toIso(row.closedAt),
    validationPassed: Boolean(row.validationPassed),
    checklist: (row.checklist ?? []).map(normaliseChecklistItem),
  };
}

function normaliseReopen(
  row: PublicPeriodReopenRequest,
): PublicPeriodReopenRequest {
  return {
    ...row,
    approvedAt: toIso(row.approvedAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: toIso(row.createdAt),
  };
}

/** `GET /accounting-period-closure/periods` — `period_closure.view` */
export async function fetchAccountingPeriods(
  query: ListAccountingPeriodsQuery = {},
): Promise<PublicAccountingPeriod[]> {
  const res = await apiGet<PublicAccountingPeriod[]>(`${BASE}/periods`, {
    financialYearId: query.financialYearId,
    periodType: query.periodType,
    status: query.status,
  });
  return (res.data ?? []).map(normalisePeriod);
}

/** `GET /accounting-period-closure/periods/:periodId` — `period_closure.view` */
export async function fetchAccountingPeriod(
  periodId: string,
): Promise<PublicAccountingPeriod> {
  const res = await apiGet<PublicAccountingPeriod>(
    `${BASE}/periods/${periodId}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Accounting period unavailable');
  }
  return normalisePeriod(res.data);
}

/** `GET …/checklist` — `period_closure.view` */
export async function fetchPeriodChecklist(
  periodId: string,
): Promise<PeriodChecklistPayload> {
  const res = await apiGet<PeriodChecklistPayload>(
    `${BASE}/periods/${periodId}/checklist`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Checklist unavailable');
  }
  return {
    ...res.data,
    validationRunAt: toIso(res.data.validationRunAt),
    validationPassed: Boolean(res.data.validationPassed),
    checklist: (res.data.checklist ?? []).map(normaliseChecklistItem),
  };
}

/** `POST /accounting-period-closure/periods` — `period_closure.manage` */
export async function createAccountingPeriod(
  input: CreateAccountingPeriodInput,
): Promise<PublicAccountingPeriod> {
  const res = await apiPost<PublicAccountingPeriod>(`${BASE}/periods`, input);
  if (!res.data) {
    throw new Error(res.message || 'Create period failed');
  }
  return normalisePeriod(res.data);
}

/** `POST …/validate` — `period_closure.manage` */
export async function runPreCloseValidation(
  periodId: string,
): Promise<PreCloseValidationResult> {
  const res = await apiPost<PreCloseValidationResult>(
    `${BASE}/periods/${periodId}/validate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Pre-close validation failed');
  }
  return {
    ...normalisePeriod(res.data),
    failedCount: Number(res.data.failedCount ?? 0),
  };
}

/** `POST …/lock` — `period_closure.manage` */
export async function lockAccountingPeriod(
  periodId: string,
): Promise<PublicAccountingPeriod> {
  const res = await apiPost<PublicAccountingPeriod>(
    `${BASE}/periods/${periodId}/lock`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Lock period failed');
  }
  return normalisePeriod(res.data);
}

/** `POST …/close` — `period_closure.manage` */
export async function closeAccountingPeriod(
  periodId: string,
): Promise<PublicAccountingPeriod> {
  const res = await apiPost<PublicAccountingPeriod>(
    `${BASE}/periods/${periodId}/close`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Close period failed');
  }
  return normalisePeriod(res.data);
}

/** `POST …/reopen-requests` — `period_closure.reopen` */
export async function requestPeriodReopen(
  periodId: string,
  input: RequestPeriodReopenInput,
): Promise<PublicPeriodReopenRequest> {
  const res = await apiPost<PublicPeriodReopenRequest>(
    `${BASE}/periods/${periodId}/reopen-requests`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reopen request failed');
  }
  return normaliseReopen(res.data);
}

/** `GET …/reopen-requests` — `period_closure.view` */
export async function fetchPeriodReopenRequests(
  periodId: string,
): Promise<PublicPeriodReopenRequest[]> {
  const res = await apiGet<PublicPeriodReopenRequest[]>(
    `${BASE}/periods/${periodId}/reopen-requests`,
  );
  return (res.data ?? []).map(normaliseReopen);
}

/** `POST …/reopen-requests/:requestId/approve` — `period_closure.approve_reopen` */
export async function approvePeriodReopen(
  periodId: string,
  requestId: string,
  input: ApprovePeriodReopenInput = {},
): Promise<ApproveReopenResult> {
  const res = await apiPost<ApproveReopenResult>(
    `${BASE}/periods/${periodId}/reopen-requests/${requestId}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve reopen failed');
  }
  return {
    request: normaliseReopen(res.data.request),
    period: normalisePeriod(res.data.period),
  };
}

/** `POST …/reopen-requests/:requestId/reject` — `period_closure.approve_reopen` */
export async function rejectPeriodReopen(
  periodId: string,
  requestId: string,
  input: RejectPeriodReopenInput,
): Promise<PublicPeriodReopenRequest> {
  const res = await apiPost<PublicPeriodReopenRequest>(
    `${BASE}/periods/${periodId}/reopen-requests/${requestId}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject reopen failed');
  }
  return normaliseReopen(res.data);
}
