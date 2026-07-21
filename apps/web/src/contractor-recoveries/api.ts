import { apiGet, apiPatch, apiPost } from '@/api/client';

export type ContractorRecoveryType =
  | 'mobilization_advance'
  | 'secured_advance'
  | 'retention'
  | 'security_deposit'
  | 'material'
  | 'equipment'
  | 'electricity_water'
  | 'labour_welfare'
  | 'damage'
  | 'penalty'
  | 'tds'
  | 'gst_tds'
  | 'manual';

export type ContractorRecoveryStatus = 'draft' | 'approved' | 'posted';

export type PublicContractorRecovery = {
  id: string;
  projectId: string;
  contractorId: string;
  workOrderId: string | null;
  type: ContractorRecoveryType;
  amount: number;
  description: string | null;
  notes: string | null;
  billId: string | null;
  materialReconciliationId: string | null;
  status: ContractorRecoveryStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListContractorRecoveriesQuery = {
  projectId?: string;
  contractorId?: string;
  billId?: string;
  type?: ContractorRecoveryType;
  status?: ContractorRecoveryStatus;
  page?: number;
  limit?: number;
};

export type CreateContractorRecoveryInput = {
  projectId: string;
  contractorId: string;
  workOrderId?: string | null;
  type: ContractorRecoveryType;
  amount: number;
  description?: string | null;
  notes?: string | null;
  billId?: string | null;
  materialReconciliationId?: string | null;
};

const BASE = '/contractor-recoveries';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(row: PublicContractorRecovery): PublicContractorRecovery {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    workOrderId: row.workOrderId == null ? null : String(row.workOrderId),
    billId: row.billId == null ? null : String(row.billId),
    materialReconciliationId:
      row.materialReconciliationId == null
        ? null
        : String(row.materialReconciliationId),
    description: row.description ?? null,
    notes: row.notes ?? null,
    approvedBy: row.approvedBy == null ? null : String(row.approvedBy),
    approvedAt: toIso(row.approvedAt),
    postedBy: row.postedBy == null ? null : String(row.postedBy),
    postedAt: toIso(row.postedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /contractor-recoveries` — `contractor_recovery.view` */
export async function listContractorRecoveries(
  query: ListContractorRecoveriesQuery = {},
): Promise<PublicContractorRecovery[]> {
  const res = await apiGet<PublicContractorRecovery[]>(BASE, {
    projectId: query.projectId,
    contractorId: query.contractorId,
    billId: query.billId,
    type: query.type,
    status: query.status,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `GET /contractor-recoveries/:id` — `contractor_recovery.view` */
export async function getContractorRecovery(
  id: string,
): Promise<PublicContractorRecovery> {
  const res = await apiGet<PublicContractorRecovery>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'Recovery unavailable');
  return normalise(res.data);
}

/** `POST /contractor-recoveries` — `contractor_recovery.manage` */
export async function createContractorRecovery(
  input: CreateContractorRecoveryInput,
): Promise<PublicContractorRecovery> {
  const res = await apiPost<PublicContractorRecovery>(BASE, input);
  if (!res.data) throw new Error(res.message || 'Failed to create recovery');
  return normalise(res.data);
}

/** `PATCH /contractor-recoveries/:id` — `contractor_recovery.manage` */
export async function updateContractorRecovery(
  id: string,
  input: Partial<Omit<CreateContractorRecoveryInput, 'projectId' | 'contractorId'>>,
): Promise<PublicContractorRecovery> {
  const res = await apiPatch<PublicContractorRecovery>(`${BASE}/${id}`, input);
  if (!res.data) throw new Error(res.message || 'Failed to update recovery');
  return normalise(res.data);
}

/** `POST /contractor-recoveries/:id/approve` — `contractor_recovery.manage` */
export async function approveContractorRecovery(
  id: string,
): Promise<PublicContractorRecovery> {
  const res = await apiPost<PublicContractorRecovery>(`${BASE}/${id}/approve`, {});
  if (!res.data) throw new Error(res.message || 'Failed to approve recovery');
  return normalise(res.data);
}

/** `POST /contractor-recoveries/:id/post` — `contractor_recovery.manage` */
export async function postContractorRecovery(
  id: string,
  billId?: string | null,
): Promise<PublicContractorRecovery> {
  const res = await apiPost<PublicContractorRecovery>(`${BASE}/${id}/post`, {
    billId: billId ?? null,
  });
  if (!res.data) throw new Error(res.message || 'Failed to post recovery');
  return normalise(res.data);
}
