import { apiGet, apiPost } from '@/api/client';
import type {
  AmendCommitmentInput,
  CancelCommitmentInput,
  CommitmentSummary,
  CreateCommitmentInput,
  ListCommitmentsQuery,
  PaginatedCommitments,
  PublicCommitment,
} from './types';

function base(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/commitments`;
}

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseCommitment(row: PublicCommitment): PublicCommitment {
  return {
    ...row,
    commitmentDate: toIso(row.commitmentDate) ?? row.commitmentDate,
    dueDate: toIso(row.dueDate),
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    cancelledAt: toIso(row.cancelledAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    paymentSchedule: (row.paymentSchedule ?? []).map((line) => ({
      ...line,
      dueDate: toIso(line.dueDate) ?? line.dueDate,
    })),
    expectedBankAccount: row.expectedBankAccount ?? {
      bankName: null,
      ifsc: null,
      accountHolderName: null,
      accountNumberLast4: null,
    },
    receipts: (row.receipts ?? []).map((r) => ({
      ...r,
      receivedAt: toIso(r.receivedAt) ?? r.receivedAt,
    })),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedCommitments['meta'] {
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

/** `GET /projects/:projectId/commitments` — `contribution_commitment.view` */
export async function fetchCommitments(
  projectId: string,
  query: ListCommitmentsQuery = {},
): Promise<PaginatedCommitments> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicCommitment[]>(base(projectId), {
    page,
    limit,
    sortOrder: query.sortOrder,
    participantId: query.participantId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseCommitment),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /projects/:projectId/commitments/summary` — `contribution_commitment.view` */
export async function fetchCommitmentSummary(
  projectId: string,
  participantId?: string,
): Promise<CommitmentSummary> {
  const res = await apiGet<CommitmentSummary>(`${base(projectId)}/summary`, {
    participantId,
  });
  if (!res.data) {
    throw new Error(res.message || 'Commitment summary unavailable');
  }
  return res.data;
}

/** `GET /projects/:projectId/commitments/:id` — `contribution_commitment.view` */
export async function fetchCommitment(
  projectId: string,
  id: string,
): Promise<PublicCommitment> {
  const res = await apiGet<PublicCommitment>(
    `${base(projectId)}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Commitment unavailable');
  }
  return normaliseCommitment(res.data);
}

/**
 * `GET …/by-number/:commitmentNumber/history`
 * — `contribution_commitment.view`
 */
export async function fetchCommitmentHistory(
  projectId: string,
  commitmentNumber: string,
): Promise<PublicCommitment[]> {
  const res = await apiGet<PublicCommitment[]>(
    `${base(projectId)}/by-number/${encodeURIComponent(commitmentNumber)}/history`,
  );
  return (res.data ?? []).map(normaliseCommitment);
}

/** `POST /projects/:projectId/commitments` — `contribution_commitment.create` */
export async function createCommitment(
  projectId: string,
  input: CreateCommitmentInput,
): Promise<PublicCommitment> {
  const res = await apiPost<PublicCommitment>(base(projectId), input);
  if (!res.data) {
    throw new Error(res.message || 'Create commitment failed');
  }
  return normaliseCommitment(res.data);
}

export type RecordReceiptInput = {
  amount: number;
  receivedAt?: string;
  reference?: string | null;
  remarks?: string | null;
};

/** `POST …/:id/receipts` — `contribution_commitment.record_receipt` */
export async function recordCommitmentReceipt(
  projectId: string,
  id: string,
  input: RecordReceiptInput,
): Promise<PublicCommitment> {
  const res = await apiPost<PublicCommitment>(
    `${base(projectId)}/${encodeURIComponent(id)}/receipts`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Record receipt failed');
  }
  return normaliseCommitment(res.data);
}

/** `POST …/:id/submit` — `contribution_commitment.submit` */
export async function submitCommitment(
  projectId: string,
  id: string,
): Promise<PublicCommitment> {
  const res = await apiPost<PublicCommitment>(
    `${base(projectId)}/${id}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit commitment failed');
  }
  return normaliseCommitment(res.data);
}

/** `POST …/:id/approve` — `contribution_commitment.approve` */
export async function approveCommitment(
  projectId: string,
  id: string,
): Promise<PublicCommitment> {
  const res = await apiPost<PublicCommitment>(
    `${base(projectId)}/${id}/approve`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve commitment failed');
  }
  return normaliseCommitment(res.data);
}

/** `POST …/:id/amend` — `contribution_commitment.amend` */
export async function amendCommitment(
  projectId: string,
  id: string,
  input: AmendCommitmentInput,
): Promise<PublicCommitment> {
  const res = await apiPost<PublicCommitment>(
    `${base(projectId)}/${id}/amend`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Amend commitment failed');
  }
  return normaliseCommitment(res.data);
}

/** `POST …/:id/cancel` — `contribution_commitment.cancel` */
export async function cancelCommitment(
  projectId: string,
  id: string,
  input: CancelCommitmentInput,
): Promise<PublicCommitment> {
  const res = await apiPost<PublicCommitment>(
    `${base(projectId)}/${id}/cancel`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel commitment failed');
  }
  return normaliseCommitment(res.data);
}
