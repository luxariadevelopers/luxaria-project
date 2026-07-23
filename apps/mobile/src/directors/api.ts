import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ActiveShareholdingSummary,
  CompanyBankAccountOption,
  CreateDirectorInput,
  DirectorUserOption,
  ListDirectorsQuery,
  ListShareholdingChangeRequestsQuery,
  ListShareholdingHistoryQuery,
  PaginatedDirectors,
  PaginatedMeta,
  ProposeShareholdingInput,
  PublicDirector,
  PublicShareholding,
  PublicShareholdingChangeRequest,
  ShareCapitalReceiptResult,
  UpdateDirectorInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseDirector(row: PublicDirector): PublicDirector {
  return {
    ...row,
    appointmentDate: toIso(row.appointmentDate),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function normaliseHolding(row: PublicShareholding): PublicShareholding {
  return {
    ...row,
    effectiveFrom: toIso(row.effectiveFrom) ?? '',
    effectiveTo: toIso(row.effectiveTo),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
  };
}

function normaliseChangeRequest(
  row: PublicShareholdingChangeRequest,
): PublicShareholdingChangeRequest {
  return {
    ...row,
    approvedAt: toIso(row.approvedAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    proposedHoldings: row.proposedHoldings ?? [],
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedMeta {
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

/** `GET /directors` — `director.view` */
export async function fetchDirectors(
  query: ListDirectorsQuery = {},
): Promise<PaginatedDirectors> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicDirector[]>('/directors', {
    ...query,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map(normaliseDirector),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /directors/:id` — `director.view` */
export async function fetchDirector(id: string): Promise<PublicDirector> {
  const res = await apiGet<PublicDirector>(`/directors/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Director not found');
  }
  return normaliseDirector(res.data);
}

/** `POST /directors` — `director.create` */
export async function createDirector(
  input: CreateDirectorInput,
): Promise<PublicDirector> {
  const res = await apiPost<PublicDirector>('/directors', input);
  if (!res.data) {
    throw new Error(res.message || 'Director create failed');
  }
  return normaliseDirector(res.data);
}

/** `PATCH /directors/:id` — `director.update` */
export async function updateDirector(
  id: string,
  input: UpdateDirectorInput,
): Promise<PublicDirector> {
  const res = await apiPatch<PublicDirector>(`/directors/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Director update failed');
  }
  return normaliseDirector(res.data);
}

/** `GET /users` — `user.view` (linked-user picker) */
export async function listUsersForDirectorLink(): Promise<DirectorUserOption[]> {
  const res = await apiGet<DirectorUserOption[]>('/users', {
    page: 1,
    limit: 100,
    status: 'active',
  });
  return res.data ?? [];
}

/** `GET /company-shareholding` — `shareholding.view` */
export async function fetchActiveShareholding(
  companyId?: string | null,
): Promise<ActiveShareholdingSummary> {
  const res = await apiGet<ActiveShareholdingSummary>('/company-shareholding', {
    companyId: companyId ?? undefined,
  });
  if (!res.data) {
    throw new Error(res.message || 'Shareholding unavailable');
  }
  return {
    ...res.data,
    holdings: (res.data.holdings ?? []).map(normaliseHolding),
  };
}

/** `GET /company-shareholding/history` — `shareholding.view` */
export async function fetchShareholdingHistory(
  query: ListShareholdingHistoryQuery = {},
): Promise<{ items: PublicShareholding[]; meta: PaginatedMeta }> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicShareholding[]>(
    '/company-shareholding/history',
    {
      page,
      limit,
      companyId: query.companyId ?? undefined,
      directorId: query.directorId,
    },
  );
  return {
    items: (res.data ?? []).map(normaliseHolding),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /company-shareholding/change-requests` — `shareholding.view` */
export async function fetchShareholdingChangeRequests(
  query: ListShareholdingChangeRequestsQuery = {},
): Promise<{ items: PublicShareholdingChangeRequest[]; meta: PaginatedMeta }> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicShareholdingChangeRequest[]>(
    '/company-shareholding/change-requests',
    {
      page,
      limit,
      companyId: query.companyId ?? undefined,
      status: query.status,
    },
  );
  return {
    items: (res.data ?? []).map(normaliseChangeRequest),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `POST /company-shareholding/change-requests` — `shareholding.propose` */
export async function proposeShareholdingChange(
  body: ProposeShareholdingInput,
): Promise<PublicShareholdingChangeRequest> {
  const res = await apiPost<PublicShareholdingChangeRequest>(
    '/company-shareholding/change-requests',
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Propose shareholding failed');
  }
  return normaliseChangeRequest(res.data);
}

/** `POST /company-shareholding/change-requests/:id/approve` — `shareholding.approve` */
export async function approveShareholdingChange(
  requestId: string,
  body: { approvalNote?: string | null; approvalReference?: string | null } = {},
): Promise<unknown> {
  const res = await apiPost(
    `/company-shareholding/change-requests/${requestId}/approve`,
    body,
  );
  return res.data;
}

/** `POST /company-shareholding/change-requests/:id/reject` — `shareholding.approve` */
export async function rejectShareholdingChange(
  requestId: string,
  body: { rejectionReason: string },
): Promise<PublicShareholdingChangeRequest> {
  const res = await apiPost<PublicShareholdingChangeRequest>(
    `/company-shareholding/change-requests/${requestId}/reject`,
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject shareholding failed');
  }
  return normaliseChangeRequest(res.data);
}

/**
 * `POST /company-shareholding/capital-receipts` — `company.update`.
 */
export async function postShareCapitalReceipt(input: {
  bankAccountId: string;
  receivedDate?: string;
  reference?: string | null;
}): Promise<ShareCapitalReceiptResult> {
  const res = await apiPost<ShareCapitalReceiptResult>(
    '/company-shareholding/capital-receipts',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Could not post share capital to bank book');
  }
  return res.data;
}

/** `GET /company-bank-accounts` — `bank.view` (active options for capital post). */
export async function fetchActiveCompanyBankAccounts(): Promise<
  CompanyBankAccountOption[]
> {
  const res = await apiGet<CompanyBankAccountOption[]>(
    '/company-bank-accounts',
    {
      page: 1,
      limit: 50,
      status: 'active',
    },
  );
  return res.data ?? [];
}
