import { apiGet, apiPatch, apiPost } from '@/api/client';

export type WorkOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'accepted'
  | 'in_progress'
  | 'partially_completed'
  | 'completed'
  | 'closed'
  | 'cancelled';

export type WorkOrderAmendmentType =
  | 'quantity'
  | 'rate'
  | 'scope'
  | 'time_extension'
  | 'revised_value'
  | 'mixed';

export type WorkOrderAmendmentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type WorkOrderResponsibility = 'company' | 'contractor' | 'shared';

export type PublicWorkOrderBoqLine = {
  id: string | null;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  value: number;
};

export type PublicWorkOrderRevision = {
  id: string | null;
  revision: number;
  amendmentId: string | null;
  contractValue: number;
  startDate: string;
  endDate: string;
  frozenAt: string;
  terms: string | null;
};

export type PublicWorkOrder = {
  id: string;
  workOrderNumber: string;
  activeRevision: number;
  projectId: string;
  siteId: string | null;
  contractorId: string;
  rateContractId: string | null;
  agreementId: string | null;
  boqScopeLines: PublicWorkOrderBoqLine[];
  locations: string[];
  startDate: string;
  endDate: string;
  contractValue: number;
  materialResponsibility: WorkOrderResponsibility;
  labourResponsibility: WorkOrderResponsibility;
  drawingIds: string[];
  terms: string | null;
  attachments: string[];
  revisions: PublicWorkOrderRevision[];
  status: WorkOrderStatus;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  acceptedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicWorkOrderAmendment = {
  id: string;
  amendmentNumber: string;
  workOrderId: string;
  projectId: string;
  targetRevision: number;
  baseRevision: number;
  type: WorkOrderAmendmentType;
  status: WorkOrderAmendmentStatus;
  reason: string;
  proposed: {
    contractValue: number;
    startDate: string;
    endDate: string;
    boqScopeLines: PublicWorkOrderBoqLine[];
  };
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
};

export type ListWorkOrdersQuery = {
  projectId?: string;
  siteId?: string;
  contractorId?: string;
  status?: WorkOrderStatus;
  page?: number;
  limit?: number;
};

export type CreateWorkOrderInput = {
  projectId: string;
  siteId?: string | null;
  contractorId: string;
  rateContractId?: string | null;
  agreementId?: string | null;
  boqScopeLines: Array<{
    boqItemId?: string | null;
    boqCode?: string | null;
    description: string;
    unit: string;
    quantity: number;
    rate: number;
  }>;
  locations?: string[];
  startDate: string;
  endDate: string;
  materialResponsibility?: WorkOrderResponsibility;
  labourResponsibility?: WorkOrderResponsibility;
  drawingIds?: string[];
  terms?: string | null;
  attachments?: string[];
  notes?: string | null;
};

export type CreateWorkOrderAmendmentInput = {
  type: WorkOrderAmendmentType;
  reason: string;
  boqScopeLines?: CreateWorkOrderInput['boqScopeLines'];
  locations?: string[];
  startDate?: string;
  endDate?: string;
  revisedValue?: number;
  terms?: string | null;
};

const BASE = '/work-orders';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(row: PublicWorkOrder): PublicWorkOrder {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    siteId: row.siteId == null ? null : String(row.siteId),
    contractorId: String(row.contractorId),
    rateContractId:
      row.rateContractId == null ? null : String(row.rateContractId),
    agreementId: row.agreementId == null ? null : String(row.agreementId),
    startDate: toIso(row.startDate) ?? String(row.startDate),
    endDate: toIso(row.endDate) ?? String(row.endDate),
    drawingIds: (row.drawingIds ?? []).map(String),
    revisions: (row.revisions ?? []).map((r) => ({
      ...r,
      id: r.id == null ? null : String(r.id),
      amendmentId: r.amendmentId == null ? null : String(r.amendmentId),
      startDate: toIso(r.startDate) ?? String(r.startDate),
      endDate: toIso(r.endDate) ?? String(r.endDate),
      frozenAt: toIso(r.frozenAt) ?? String(r.frozenAt),
    })),
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    issuedAt: toIso(row.issuedAt),
    acceptedAt: toIso(row.acceptedAt),
    closedAt: toIso(row.closedAt),
    cancelledAt: toIso(row.cancelledAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function normaliseAmendment(
  row: PublicWorkOrderAmendment,
): PublicWorkOrderAmendment {
  return {
    ...row,
    id: String(row.id),
    workOrderId: String(row.workOrderId),
    projectId: String(row.projectId),
    proposed: {
      ...row.proposed,
      startDate:
        toIso(row.proposed.startDate) ?? String(row.proposed.startDate),
      endDate: toIso(row.proposed.endDate) ?? String(row.proposed.endDate),
      boqScopeLines: row.proposed.boqScopeLines ?? [],
    },
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    rejectedAt: toIso(row.rejectedAt),
  };
}

/** `GET /work-orders` — `work_order.view` */
export async function fetchWorkOrders(
  query: ListWorkOrdersQuery = {},
): Promise<PublicWorkOrder[]> {
  const res = await apiGet<PublicWorkOrder[]>(BASE, {
    projectId: query.projectId,
    siteId: query.siteId,
    contractorId: query.contractorId,
    status: query.status,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `GET /work-orders/:id` — `work_order.view` */
export async function fetchWorkOrder(id: string): Promise<PublicWorkOrder> {
  const res = await apiGet<PublicWorkOrder>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'Work order unavailable');
  return normalise(res.data);
}

/** `POST /work-orders` — `work_order.create` */
export async function createWorkOrder(
  input: CreateWorkOrderInput,
): Promise<PublicWorkOrder> {
  const res = await apiPost<PublicWorkOrder>(BASE, input);
  if (!res.data) throw new Error(res.message || 'Failed to create work order');
  return normalise(res.data);
}

/** `PATCH /work-orders/:id` — `work_order.create` (draft only) */
export async function updateWorkOrder(
  id: string,
  input: Partial<Omit<CreateWorkOrderInput, 'projectId' | 'contractorId'>>,
): Promise<PublicWorkOrder> {
  const res = await apiPatch<PublicWorkOrder>(`${BASE}/${id}`, input);
  if (!res.data) throw new Error(res.message || 'Failed to update work order');
  return normalise(res.data);
}

async function postTransition(
  id: string,
  action: string,
  body: Record<string, unknown> = {},
): Promise<PublicWorkOrder> {
  const res = await apiPost<PublicWorkOrder>(`${BASE}/${id}/${action}`, body);
  if (!res.data) throw new Error(res.message || `Failed to ${action}`);
  return normalise(res.data);
}

export const submitWorkOrder = (id: string) => postTransition(id, 'submit');
export const approveWorkOrder = (id: string) => postTransition(id, 'approve');
export const issueWorkOrder = (id: string) => postTransition(id, 'issue');
export const acceptWorkOrder = (id: string) => postTransition(id, 'accept');
export const startWorkOrder = (id: string) => postTransition(id, 'start');
export const partiallyCompleteWorkOrder = (id: string) =>
  postTransition(id, 'partially-complete');
export const completeWorkOrder = (id: string) => postTransition(id, 'complete');
export const closeWorkOrder = (id: string) => postTransition(id, 'close');
export const cancelWorkOrder = (id: string, reason?: string) =>
  postTransition(id, 'cancel', { reason: reason ?? null });

/** `POST /work-orders/:id/amendments` — `work_order.create` */
export async function createWorkOrderAmendment(
  workOrderId: string,
  input: CreateWorkOrderAmendmentInput,
): Promise<PublicWorkOrderAmendment> {
  const res = await apiPost<PublicWorkOrderAmendment>(
    `${BASE}/${workOrderId}/amendments`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to create amendment');
  }
  return normaliseAmendment(res.data);
}

/** `GET /work-orders/:id/amendments` — `work_order.view` */
export async function fetchWorkOrderAmendments(
  workOrderId: string,
): Promise<PublicWorkOrderAmendment[]> {
  const res = await apiGet<PublicWorkOrderAmendment[]>(
    `${BASE}/${workOrderId}/amendments`,
  );
  return (res.data ?? []).map(normaliseAmendment);
}

/** `POST /work-orders/amendments/:id/approve` — `work_order.approve` */
export async function approveWorkOrderAmendment(amendmentId: string): Promise<{
  workOrder: PublicWorkOrder;
  amendment: PublicWorkOrderAmendment;
}> {
  const res = await apiPost<{
    workOrder: PublicWorkOrder;
    amendment: PublicWorkOrderAmendment;
  }>(`${BASE}/amendments/${amendmentId}/approve`, {});
  if (!res.data) {
    throw new Error(res.message || 'Failed to approve amendment');
  }
  return {
    workOrder: normalise(res.data.workOrder),
    amendment: normaliseAmendment(res.data.amendment),
  };
}

/** `POST /work-orders/amendments/:id/reject` — `work_order.approve` */
export async function rejectWorkOrderAmendment(
  amendmentId: string,
  reason?: string,
): Promise<PublicWorkOrderAmendment> {
  const res = await apiPost<PublicWorkOrderAmendment>(
    `${BASE}/amendments/${amendmentId}/reject`,
    { reason: reason ?? null },
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to reject amendment');
  }
  return normaliseAmendment(res.data);
}
