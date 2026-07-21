import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ApprovePurchaseRequestInput,
  CreatePurchaseRequestInput,
  ListPurchaseRequestsQuery,
  MaterialStatus,
  PaginatedPurchaseRequests,
  PublicBoqItemOption,
  PublicMaterial,
  PublicPurchaseRequest,
  PublicStockBalance,
  RejectPurchaseRequestInput,
  ReturnPurchaseRequestInput,
  ReviewPurchaseRequestInput,
  UpdatePurchaseRequestInput,
} from './types';
import { MaterialStatus as MaterialStatusConst } from './types';

const BASE = '/purchase-requests';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  const iso = toIso(value);
  if (!iso) return '';
  return iso.slice(0, 10);
}

function normaliseRequest(row: PublicPurchaseRequest): PublicPurchaseRequest {
  return {
    ...row,
    siteId: row.siteId ?? null,
    warehouseSiteId: row.warehouseSiteId ?? null,
    sourceReorderAlertId: row.sourceReorderAlertId ?? null,
    requiredByDate: toDateOnly(row.requiredByDate) || row.requiredByDate,
    reviewedAt: toIso(row.reviewedAt),
    approvedAt: toIso(row.approvedAt),
    warnings: row.warnings ?? [],
    items: (row.items ?? []).map((item) => ({
      ...item,
      warnings: item.warnings ?? [],
    })),
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
): PaginatedPurchaseRequests['meta'] {
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

/** `GET /purchase-requests` — `purchase.view` */
export async function fetchPurchaseRequests(
  query: ListPurchaseRequestsQuery = {},
): Promise<PaginatedPurchaseRequests> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicPurchaseRequest[]>(BASE, {
    page,
    limit,
    search: query.search,
    projectId: query.projectId,
    status: query.status,
    priority: query.priority,
    requestedBy: query.requestedBy,
  });
  return {
    items: (res.data ?? []).map(normaliseRequest),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /purchase-requests/:id` — `purchase.view` */
export async function fetchPurchaseRequest(
  id: string,
): Promise<PublicPurchaseRequest> {
  const res = await apiGet<PublicPurchaseRequest>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Purchase request unavailable');
  }
  return normaliseRequest(res.data);
}

/** `POST /purchase-requests` — `purchase.request` */
export async function createPurchaseRequest(
  input: CreatePurchaseRequestInput,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `PATCH /purchase-requests/:id` — `purchase.request` */
export async function updatePurchaseRequest(
  id: string,
  input: UpdatePurchaseRequestInput,
): Promise<PublicPurchaseRequest> {
  const res = await apiPatch<PublicPurchaseRequest>(`${BASE}/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Update purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/submit` — `purchase.request` */
export async function submitPurchaseRequest(
  id: string,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(`${BASE}/${id}/submit`);
  if (!res.data) {
    throw new Error(res.message || 'Submit purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/review` — `purchase.approve` (Phase 062) */
export async function reviewPurchaseRequest(
  id: string,
  input: ReviewPurchaseRequestInput = {},
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(
    `${BASE}/${id}/review`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Review purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/approve` — `purchase.approve` (partial line approval) */
export async function approvePurchaseRequest(
  id: string,
  input: ApprovePurchaseRequestInput,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(
    `${BASE}/${id}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/reject` — `purchase.approve` */
export async function rejectPurchaseRequest(
  id: string,
  input: RejectPurchaseRequestInput,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(
    `${BASE}/${id}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/return` — `purchase.approve` */
export async function returnPurchaseRequest(
  id: string,
  input: ReturnPurchaseRequestInput = {},
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(
    `${BASE}/${id}/return`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Return purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/start-sourcing` — `purchase.order` */
export async function startSourcingPurchaseRequest(
  id: string,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(
    `${BASE}/${id}/start-sourcing`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Start sourcing failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/close` — `purchase.order` */
export async function closePurchaseRequest(
  id: string,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(`${BASE}/${id}/close`);
  if (!res.data) {
    throw new Error(res.message || 'Close purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `POST …/:id/cancel` — `purchase.request` */
export async function cancelPurchaseRequest(
  id: string,
): Promise<PublicPurchaseRequest> {
  const res = await apiPost<PublicPurchaseRequest>(`${BASE}/${id}/cancel`);
  if (!res.data) {
    throw new Error(res.message || 'Cancel purchase request failed');
  }
  return normaliseRequest(res.data);
}

/** `GET /materials` — `material.view` */
export async function fetchMaterials(query: {
  search?: string;
  status?: MaterialStatus;
  page?: number;
  limit?: number;
}): Promise<PublicMaterial[]> {
  const res = await apiGet<PublicMaterial[]>('/materials', {
    search: query.search,
    status: query.status ?? MaterialStatusConst.Active,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return res.data ?? [];
}

/** `GET /materials/:id` — `material.view` */
export async function fetchMaterial(id: string): Promise<PublicMaterial> {
  const res = await apiGet<PublicMaterial>(`/materials/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Material unavailable');
  }
  return res.data;
}

/**
 * `GET /stock-ledger/balance` — `stock.view`
 * On-hand quantity in base units for material + project.
 */
export async function fetchMaterialStockBalance(query: {
  projectId: string;
  materialId: string;
  location?: string;
}): Promise<PublicStockBalance> {
  const res = await apiGet<PublicStockBalance>('/stock-ledger/balance', {
    projectId: query.projectId,
    materialId: query.materialId,
    location: query.location,
  });
  if (!res.data) {
    throw new Error(res.message || 'Stock balance unavailable');
  }
  return res.data;
}

/** `GET /boq/projects/:projectId/items` — `boq.view` */
export async function fetchBoqItems(query: {
  projectId: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PublicBoqItemOption[]> {
  const res = await apiGet<PublicBoqItemOption[]>(
    `/boq/projects/${query.projectId}/items`,
    {
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    },
  );
  return (res.data ?? []).map((row) => ({
    id: row.id,
    boqCode: row.boqCode,
    description: row.description,
    status: row.status,
  }));
}
