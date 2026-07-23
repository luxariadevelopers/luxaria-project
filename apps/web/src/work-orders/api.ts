import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateWorkOrderAmendmentInput,
  CreateWorkOrderInput,
  ListWorkOrdersQuery,
  PaginatedWorkOrders,
  PublicWorkOrder,
  PublicWorkOrderAmendment,
  UpdateWorkOrderInput,
} from './types';

export type {
  CreateWorkOrderAmendmentInput,
  CreateWorkOrderInput,
  ListWorkOrdersQuery,
  PaginatedWorkOrders,
  PublicWorkOrder,
  PublicWorkOrderAmendment,
  PublicWorkOrderBoqLine,
  PublicWorkOrderRevision,
  UpdateWorkOrderInput,
  WorkOrderAmendmentStatus,
  WorkOrderAmendmentType,
  WorkOrderResponsibility,
  WorkOrderStatus,
} from './types';

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

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedWorkOrders['meta'] {
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

/** `GET /work-orders` — `work_order.view` */
export async function fetchWorkOrders(
  query: ListWorkOrdersQuery = {},
): Promise<PaginatedWorkOrders> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicWorkOrder[]>(BASE, {
    projectId: query.projectId,
    siteId: query.siteId,
    contractorId: query.contractorId,
    status: query.status,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map(normalise),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
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
  input: UpdateWorkOrderInput,
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
