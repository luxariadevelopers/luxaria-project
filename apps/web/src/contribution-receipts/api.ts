import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPost } from '@/api/client';
import type {
  BankAccountOption,
  CancelContributionReceiptInput,
  ContributionBalances,
  CreateContributionReceiptInput,
  ListContributionReceiptsQuery,
  PaginatedContributionReceipts,
  PublicContributionReceipt,
} from './types';

function base(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/contribution-receipts`;
}

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseReceipt(
  row: PublicContributionReceipt,
): PublicContributionReceipt {
  return {
    ...row,
    receivedDate: toIso(row.receivedDate) ?? row.receivedDate,
    submittedAt: toIso(row.submittedAt),
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
): PaginatedContributionReceipts['meta'] {
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

/** `GET /projects/:projectId/contribution-receipts` — `contribution_receipt.view` */
export async function fetchContributionReceipts(
  projectId: string,
  query: ListContributionReceiptsQuery = {},
): Promise<PaginatedContributionReceipts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicContributionReceipt[]>(base(projectId), {
    page,
    limit,
    sortOrder: query.sortOrder,
    participantId: query.participantId,
    commitmentId: query.commitmentId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseReceipt),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET …/balances` — `contribution_receipt.view` */
export async function fetchContributionBalances(
  projectId: string,
  participantId?: string,
): Promise<ContributionBalances> {
  const res = await apiGet<ContributionBalances>(
    `${base(projectId)}/balances`,
    { participantId },
  );
  if (!res.data) {
    throw new Error(res.message || 'Balances unavailable');
  }
  return {
    project: {
      ...res.data.project,
      lastReceiptAt: toIso(res.data.project.lastReceiptAt),
    },
    participant: res.data.participant
      ? {
          ...res.data.participant,
          lastReceiptAt: toIso(res.data.participant.lastReceiptAt),
        }
      : null,
  };
}

/**
 * `POST /` — `contribution_receipt.create`
 * Optional `Idempotency-Key` (Nest scope `contribution.receipt`).
 */
export async function createContributionReceipt(
  projectId: string,
  input: CreateContributionReceiptInput,
  idempotencyKey?: string,
): Promise<PublicContributionReceipt> {
  const { data } = await apiClient.post<ApiResponse<PublicContributionReceipt>>(
    base(projectId),
    input,
    idempotencyKey
      ? { headers: { 'Idempotency-Key': idempotencyKey } }
      : undefined,
  );
  if (!data.data) {
    throw new Error(data.message || 'Create receipt failed');
  }
  return normaliseReceipt(data.data);
}

/** `POST …/:id/submit` — `contribution_receipt.submit` */
export async function submitContributionReceipt(
  projectId: string,
  id: string,
): Promise<PublicContributionReceipt> {
  const res = await apiPost<PublicContributionReceipt>(
    `${base(projectId)}/${id}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit receipt failed');
  }
  return normaliseReceipt(res.data);
}

/** `POST …/:id/verify` — `contribution_receipt.verify` */
export async function verifyContributionReceipt(
  projectId: string,
  id: string,
): Promise<PublicContributionReceipt> {
  const res = await apiPost<PublicContributionReceipt>(
    `${base(projectId)}/${id}/verify`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Verify receipt failed');
  }
  return normaliseReceipt(res.data);
}

/** `POST …/:id/post` — `contribution_receipt.post` (generates PDF) */
export async function postContributionReceipt(
  projectId: string,
  id: string,
): Promise<PublicContributionReceipt> {
  const res = await apiPost<PublicContributionReceipt>(
    `${base(projectId)}/${id}/post`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Post receipt failed');
  }
  return normaliseReceipt(res.data);
}

/** `POST …/:id/cancel` — `contribution_receipt.cancel` */
export async function cancelContributionReceipt(
  projectId: string,
  id: string,
  input: CancelContributionReceiptInput,
): Promise<PublicContributionReceipt> {
  const res = await apiPost<PublicContributionReceipt>(
    `${base(projectId)}/${id}/cancel`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel receipt failed');
  }
  return normaliseReceipt(res.data);
}

/**
 * `POST …/:id/document` — `contribution_receipt.upload_document`
 * Multipart field `file`.
 */
export async function uploadContributionReceiptDocument(
  projectId: string,
  id: string,
  file: File,
): Promise<PublicContributionReceipt> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ApiResponse<PublicContributionReceipt>>(
    `${base(projectId)}/${id}/document`,
    form,
    { headers: { 'Content-Type': undefined } },
  );
  if (!data.data) {
    throw new Error(data.message || 'Document upload failed');
  }
  return normaliseReceipt(data.data);
}

/**
 * `GET /company-bank-accounts` — `bank.view` (for receiving-account selector).
 * Not inventing a bank module — thin list for receipt create only.
 */
export async function fetchBankAccountOptions(): Promise<BankAccountOption[]> {
  const res = await apiGet<
    Array<{
      id: string;
      accountCode: string;
      bankName: string;
      maskedAccountNumber: string;
    }>
  >('/company-bank-accounts', { limit: 100 });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    label: `${row.bankName} · ${row.accountCode} · ${row.maskedAccountNumber}`,
  }));
}
