import { apiGet, apiPatch, apiPost } from '@/api/client';

export type MaterialReconciliationStatus =
  | 'draft'
  | 'approved'
  | 'posted_to_bill';

export type MaterialReconciliationPeriod = {
  from: string;
  to: string;
};

export type PublicMaterialReconciliation = {
  id: string;
  projectId: string;
  contractorId: string;
  workOrderId: string | null;
  materialId: string;
  period: MaterialReconciliationPeriod;
  issuedQuantity: number;
  theoreticalConsumption: number;
  approvedWastage: number;
  returnedQuantity: number;
  recoverableDifference: number;
  unitRate: number;
  recoveryAmount: number;
  status: MaterialReconciliationStatus;
  billId: string | null;
  recoveryId: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListMaterialReconciliationsQuery = {
  projectId?: string;
  contractorId?: string;
  materialId?: string;
  workOrderId?: string;
  status?: MaterialReconciliationStatus;
  page?: number;
  limit?: number;
};

export type CreateMaterialReconciliationInput = {
  projectId: string;
  contractorId: string;
  workOrderId?: string | null;
  materialId: string;
  period: MaterialReconciliationPeriod;
  issuedQuantity: number;
  theoreticalConsumption: number;
  approvedWastage: number;
  returnedQuantity: number;
  unitRate?: number;
  notes?: string | null;
};

const BASE = '/contractor-material-reconciliations';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(
  row: PublicMaterialReconciliation,
): PublicMaterialReconciliation {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    workOrderId: row.workOrderId == null ? null : String(row.workOrderId),
    materialId: String(row.materialId),
    period: {
      from: toIso(row.period?.from) ?? '',
      to: toIso(row.period?.to) ?? '',
    },
    billId: row.billId == null ? null : String(row.billId),
    recoveryId: row.recoveryId == null ? null : String(row.recoveryId),
    notes: row.notes ?? null,
    approvedBy: row.approvedBy == null ? null : String(row.approvedBy),
    approvedAt: toIso(row.approvedAt),
    postedBy: row.postedBy == null ? null : String(row.postedBy),
    postedAt: toIso(row.postedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /contractor-material-reconciliations` — `contractor_recovery.view` */
export async function listMaterialReconciliations(
  query: ListMaterialReconciliationsQuery = {},
): Promise<PublicMaterialReconciliation[]> {
  const res = await apiGet<PublicMaterialReconciliation[]>(BASE, {
    projectId: query.projectId,
    contractorId: query.contractorId,
    materialId: query.materialId,
    workOrderId: query.workOrderId,
    status: query.status,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `GET /contractor-material-reconciliations/:id` — `contractor_recovery.view` */
export async function getMaterialReconciliation(
  id: string,
): Promise<PublicMaterialReconciliation> {
  const res = await apiGet<PublicMaterialReconciliation>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Material reconciliation unavailable');
  }
  return normalise(res.data);
}

/** `POST /contractor-material-reconciliations` — `contractor_recovery.manage` */
export async function createMaterialReconciliation(
  input: CreateMaterialReconciliationInput,
): Promise<PublicMaterialReconciliation> {
  const res = await apiPost<PublicMaterialReconciliation>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create material reconciliation');
  }
  return normalise(res.data);
}

/** `PATCH /contractor-material-reconciliations/:id` — `contractor_recovery.manage` */
export async function updateMaterialReconciliation(
  id: string,
  input: Partial<Omit<CreateMaterialReconciliationInput, 'projectId' | 'contractorId' | 'materialId'>>,
): Promise<PublicMaterialReconciliation> {
  const res = await apiPatch<PublicMaterialReconciliation>(`${BASE}/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to update material reconciliation');
  }
  return normalise(res.data);
}

/** `POST /contractor-material-reconciliations/:id/approve` — `contractor_recovery.manage` */
export async function approveMaterialReconciliation(
  id: string,
): Promise<PublicMaterialReconciliation> {
  const res = await apiPost<PublicMaterialReconciliation>(
    `${BASE}/${id}/approve`,
    {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to approve material reconciliation');
  }
  return normalise(res.data);
}

/** `POST /contractor-material-reconciliations/:id/post-to-bill` — `contractor_recovery.manage` */
export async function postMaterialReconciliationToBill(
  id: string,
  billId: string,
): Promise<PublicMaterialReconciliation> {
  const res = await apiPost<PublicMaterialReconciliation>(
    `${BASE}/${id}/post-to-bill`,
    { billId },
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to post reconciliation to bill');
  }
  return normalise(res.data);
}
