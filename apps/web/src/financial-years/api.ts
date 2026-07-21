import type { PaginationMeta } from '@luxaria/shared-types';
import { apiGet, apiPost } from '@/api/client';
import type {
  ApprovedFinancialYearUnlock,
  ApproveFinancialYearUnlockInput,
  CreateFinancialYearInput,
  FinancialYearCompany,
  FinancialYearListQuery,
  PaginatedFinancialYears,
  PaginatedUnlockRequests,
  PublicFinancialYear,
  PublicFinancialYearUnlockRequest,
  RejectFinancialYearUnlockInput,
  RequestFinancialYearUnlockInput,
  TransactionDateValidationResult,
  UnlockRequestListQuery,
  ValidateTransactionDateInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseFinancialYear(
  financialYear: PublicFinancialYear,
): PublicFinancialYear {
  return {
    ...financialYear,
    companyId: financialYear.companyId ?? null,
    startDate: toIso(financialYear.startDate) ?? '',
    endDate: toIso(financialYear.endDate) ?? '',
    lockedAt: toIso(financialYear.lockedAt),
    lockedBy: financialYear.lockedBy ?? null,
    createdAt: toIso(financialYear.createdAt) ?? undefined,
    updatedAt: toIso(financialYear.updatedAt) ?? undefined,
  };
}

function normaliseUnlockRequest(
  request: PublicFinancialYearUnlockRequest,
): PublicFinancialYearUnlockRequest {
  return {
    ...request,
    approvedBy: request.approvedBy ?? null,
    approvedAt: toIso(request.approvedAt),
    approvalNote: request.approvalNote ?? null,
    rejectedBy: request.rejectedBy ?? null,
    rejectedAt: toIso(request.rejectedAt),
    rejectionReason: request.rejectionReason ?? null,
    createdAt: toIso(request.createdAt) ?? undefined,
  };
}

function readPaginationMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginationMeta {
  const total = Number(meta?.total ?? 0);
  const totalPages = Number(
    meta?.totalPages ?? Math.max(1, Math.ceil(total / limit)),
  );
  return {
    page: Number(meta?.page ?? page),
    limit: Number(meta?.limit ?? limit),
    total,
    totalPages,
    hasNextPage: Boolean(meta?.hasNextPage),
    hasPrevPage: Boolean(meta?.hasPrevPage),
  };
}

function requireData<T>(data: T | null | undefined, message: string): T {
  if (data == null) {
    throw new Error(message);
  }
  return data;
}

/** GET /financial-years — only backend-supported filters are sent. */
export async function fetchFinancialYears(
  query: FinancialYearListQuery = {},
): Promise<PaginatedFinancialYears> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const response = await apiGet<PublicFinancialYear[]>('/financial-years', {
    ...query,
    page,
    limit,
  });
  return {
    items: (response.data ?? []).map(normaliseFinancialYear),
    meta: readPaginationMeta(
      response.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

export async function fetchCurrentFinancialYear(
  companyId?: string | null,
): Promise<PublicFinancialYear> {
  const response = await apiGet<PublicFinancialYear>(
    '/financial-years/current',
    companyId ? { companyId } : undefined,
  );
  return normaliseFinancialYear(
    requireData(response.data, 'Current financial year not found'),
  );
}

export async function fetchFinancialYear(
  financialYearId: string,
): Promise<PublicFinancialYear> {
  const response = await apiGet<PublicFinancialYear>(
    `/financial-years/${financialYearId}`,
  );
  return normaliseFinancialYear(
    requireData(response.data, 'Financial year not found'),
  );
}

export async function createFinancialYear(
  input: CreateFinancialYearInput,
): Promise<PublicFinancialYear> {
  const response = await apiPost<PublicFinancialYear>('/financial-years', {
    ...input,
    name: input.name.trim(),
  });
  return normaliseFinancialYear(
    requireData(response.data, 'Financial year creation failed'),
  );
}

export async function setCurrentFinancialYear(
  financialYearId: string,
): Promise<PublicFinancialYear> {
  const response = await apiPost<PublicFinancialYear>(
    `/financial-years/${financialYearId}/set-current`,
  );
  return normaliseFinancialYear(
    requireData(response.data, 'Could not set the current financial year'),
  );
}

export async function lockFinancialYear(
  financialYearId: string,
): Promise<PublicFinancialYear> {
  const response = await apiPost<PublicFinancialYear>(
    `/financial-years/${financialYearId}/lock`,
  );
  return normaliseFinancialYear(
    requireData(response.data, 'Financial year lock failed'),
  );
}

export async function validateFinancialYearTransactionDate(
  input: ValidateTransactionDateInput,
): Promise<TransactionDateValidationResult> {
  const response = await apiPost<TransactionDateValidationResult>(
    '/financial-years/validate-date',
    input,
  );
  const result = requireData(
    response.data,
    'Transaction date validation failed',
  );
  return {
    ...result,
    financialYear: result.financialYear
      ? normaliseFinancialYear(result.financialYear)
      : null,
  };
}

export async function requestFinancialYearUnlock(
  financialYearId: string,
  input: RequestFinancialYearUnlockInput,
): Promise<PublicFinancialYearUnlockRequest> {
  const response = await apiPost<PublicFinancialYearUnlockRequest>(
    `/financial-years/${financialYearId}/unlock-requests`,
    { reason: input.reason.trim() },
  );
  return normaliseUnlockRequest(
    requireData(response.data, 'Unlock request submission failed'),
  );
}

export async function fetchFinancialYearUnlockRequests(
  financialYearId: string,
  query: UnlockRequestListQuery = {},
): Promise<PaginatedUnlockRequests> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const response = await apiGet<PublicFinancialYearUnlockRequest[]>(
    `/financial-years/${financialYearId}/unlock-requests`,
    { ...query, page, limit },
  );
  return {
    items: (response.data ?? []).map(normaliseUnlockRequest),
    meta: readPaginationMeta(
      response.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

export async function approveFinancialYearUnlock(
  financialYearId: string,
  requestId: string,
  input: ApproveFinancialYearUnlockInput = {},
): Promise<ApprovedFinancialYearUnlock> {
  const response = await apiPost<ApprovedFinancialYearUnlock>(
    `/financial-years/${financialYearId}/unlock-requests/${requestId}/approve`,
    {
      approvalNote: input.approvalNote?.trim() || undefined,
    },
  );
  const result = requireData(response.data, 'Unlock approval failed');
  return {
    financialYear: normaliseFinancialYear(result.financialYear),
    unlockRequest: normaliseUnlockRequest(result.unlockRequest),
  };
}

export async function rejectFinancialYearUnlock(
  financialYearId: string,
  requestId: string,
  input: RejectFinancialYearUnlockInput,
): Promise<PublicFinancialYearUnlockRequest> {
  const response = await apiPost<PublicFinancialYearUnlockRequest>(
    `/financial-years/${financialYearId}/unlock-requests/${requestId}/reject`,
    { rejectionReason: input.rejectionReason.trim() },
  );
  return normaliseUnlockRequest(
    requireData(response.data, 'Unlock rejection failed'),
  );
}

/** Read-only tenant label lookup; requires company.view on the backend. */
export async function fetchFinancialYearCompany(
  companyId?: string | null,
): Promise<FinancialYearCompany> {
  const response = await apiGet<FinancialYearCompany>(
    companyId ? `/companies/${companyId}` : '/companies/primary',
  );
  return requireData(response.data, 'Company unavailable');
}
