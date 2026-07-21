import { apiGet, apiPatch, apiPost } from '@/api/client';

export type RetentionKind = 'deduction' | 'release';

export type RetentionReleaseStage =
  | 'practical_completion'
  | 'defect_liability'
  | 'bg_replacement';

export type RetentionStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'released'
  | 'rejected'
  | 'cancelled';

export type PublicContractorRetention = {
  id: string;
  retentionNumber: string;
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  billId: string | null;
  kind: RetentionKind;
  ceilingAmount: number;
  amount: number;
  releaseStage: RetentionReleaseStage | null;
  bgReference: string | null;
  status: RetentionStatus;
  notes: string | null;
  rejectionReason: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RetentionRegisterRow = {
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  ceilingAmount: number;
  totalDeducted: number;
  totalReleased: number;
  balanceHeld: number;
  deductionCount: number;
  releaseCount: number;
};

export type ListRetentionQuery = {
  projectId?: string;
  contractorId?: string;
  agreementId?: string;
  billId?: string;
  kind?: RetentionKind;
  status?: RetentionStatus;
  releaseStage?: RetentionReleaseStage;
  page?: number;
  limit?: number;
};

const BASE = '/contractor-retention';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(row: PublicContractorRetention): PublicContractorRetention {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    agreementId: row.agreementId == null ? null : String(row.agreementId),
    billId: row.billId == null ? null : String(row.billId),
    ceilingAmount: Number(row.ceilingAmount ?? 0),
    amount: Number(row.amount ?? 0),
    releaseStage: row.releaseStage ?? null,
    bgReference: row.bgReference ?? null,
    notes: row.notes ?? null,
    rejectionReason: row.rejectionReason ?? null,
    requestedBy: row.requestedBy == null ? null : String(row.requestedBy),
    requestedAt: toIso(row.requestedAt),
    approvedBy: row.approvedBy == null ? null : String(row.approvedBy),
    approvedAt: toIso(row.approvedAt),
    rejectedBy: row.rejectedBy == null ? null : String(row.rejectedBy),
    rejectedAt: toIso(row.rejectedAt),
    releasedBy: row.releasedBy == null ? null : String(row.releasedBy),
    releasedAt: toIso(row.releasedAt),
    cancelledBy: row.cancelledBy == null ? null : String(row.cancelledBy),
    cancelledAt: toIso(row.cancelledAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /contractor-retention/register` — `contractor_retention.view` */
export async function fetchRetentionRegister(query: {
  projectId?: string;
  contractorId?: string;
  agreementId?: string;
} = {}): Promise<RetentionRegisterRow[]> {
  const res = await apiGet<RetentionRegisterRow[]>(`${BASE}/register`, {
    projectId: query.projectId,
    contractorId: query.contractorId,
    agreementId: query.agreementId,
  });
  return (res.data ?? []).map((r) => ({
    projectId: String(r.projectId),
    contractorId: String(r.contractorId),
    agreementId: r.agreementId == null ? null : String(r.agreementId),
    ceilingAmount: Number(r.ceilingAmount ?? 0),
    totalDeducted: Number(r.totalDeducted ?? 0),
    totalReleased: Number(r.totalReleased ?? 0),
    balanceHeld: Number(r.balanceHeld ?? 0),
    deductionCount: Number(r.deductionCount ?? 0),
    releaseCount: Number(r.releaseCount ?? 0),
  }));
}

/** `GET /contractor-retention` — `contractor_retention.view` */
export async function fetchRetentionRecords(
  query: ListRetentionQuery = {},
): Promise<PublicContractorRetention[]> {
  const res = await apiGet<PublicContractorRetention[]>(BASE, {
    projectId: query.projectId,
    contractorId: query.contractorId,
    agreementId: query.agreementId,
    billId: query.billId,
    kind: query.kind,
    status: query.status,
    releaseStage: query.releaseStage,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `POST /contractor-retention/:id/submit` — `contractor_retention.manage` */
export async function submitRetention(
  id: string,
): Promise<PublicContractorRetention> {
  const res = await apiPost<PublicContractorRetention>(`${BASE}/${id}/submit`, {});
  if (!res.data) throw new Error(res.message || 'Failed to submit retention');
  return normalise(res.data);
}

/** `POST /contractor-retention/:id/approve` — `contractor_retention.manage` */
export async function approveRetention(
  id: string,
): Promise<PublicContractorRetention> {
  const res = await apiPost<PublicContractorRetention>(`${BASE}/${id}/approve`, {});
  if (!res.data) throw new Error(res.message || 'Failed to approve retention');
  return normalise(res.data);
}

/** `POST /contractor-retention/:id/release` — `contractor_retention.release` */
export async function releaseRetention(
  id: string,
): Promise<PublicContractorRetention> {
  const res = await apiPost<PublicContractorRetention>(`${BASE}/${id}/release`, {});
  if (!res.data) throw new Error(res.message || 'Failed to release retention');
  return normalise(res.data);
}

/** `PATCH /contractor-retention/:id` — `contractor_retention.manage` */
export async function updateRetention(
  id: string,
  input: Partial<{
    agreementId: string | null;
    billId: string | null;
    ceilingAmount: number;
    amount: number;
    releaseStage: RetentionReleaseStage | null;
    bgReference: string | null;
    notes: string | null;
  }>,
): Promise<PublicContractorRetention> {
  const res = await apiPatch<PublicContractorRetention>(`${BASE}/${id}`, input);
  if (!res.data) throw new Error(res.message || 'Failed to update retention');
  return normalise(res.data);
}
