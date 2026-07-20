import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  AttachSignaturesInput,
  CreateMaterialIssueInput,
  CreateMaterialReturnInput,
  ListMaterialIssuesQuery,
  MaterialIssueUserOption,
  PaginatedMaterialIssues,
  PublicBoqItemOption,
  PublicMaterialIssue,
  PublicMaterialOption,
  UpdateMaterialIssueInput,
} from './types';

const BASE = '/material-issues';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseIssue(row: PublicMaterialIssue): PublicMaterialIssue {
  return {
    ...row,
    issueDate: toIso(row.issueDate) ?? row.issueDate,
    submittedAt: toIso(row.submittedAt),
    confirmedAt: toIso(row.confirmedAt),
    cancelledAt: toIso(row.cancelledAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    contractorId: row.contractorId ?? null,
    blockId: row.blockId ?? null,
    floorId: row.floorId ?? null,
    notes: row.notes ?? null,
    storeLocation: row.storeLocation ?? '',
    items: (row.items ?? []).map((item) => ({
      ...item,
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
      batch: item.batch ?? null,
      notes: item.notes ?? null,
      returnedBaseQuantity: Number(item.returnedBaseQuantity ?? 0),
      remainingBaseQuantity: Number(item.remainingBaseQuantity ?? 0),
      baseUnitQuantity: Number(item.baseUnitQuantity ?? 0),
      quantity: Number(item.quantity ?? 0),
      stockLedgerEntryId: item.stockLedgerEntryId ?? null,
    })),
    signatures: {
      recipientSignatureDocumentId:
        row.signatures?.recipientSignatureDocumentId ?? null,
      recipientSignatureChecksum:
        row.signatures?.recipientSignatureChecksum ?? null,
      issuerSignatureDocumentId:
        row.signatures?.issuerSignatureDocumentId ?? null,
      issuerSignatureChecksum: row.signatures?.issuerSignatureChecksum ?? null,
      recipientSignedAt: toIso(row.signatures?.recipientSignedAt ?? null),
    },
    returns: (row.returns ?? []).map((ret) => ({
      ...ret,
      returnDate: toIso(ret.returnDate) ?? ret.returnDate,
      postedAt: toIso(ret.postedAt),
      notes: ret.notes ?? null,
      items: (ret.items ?? []).map((item) => ({
        ...item,
        reason: item.reason ?? null,
        stockLedgerEntryId: item.stockLedgerEntryId ?? null,
        quantity: Number(item.quantity ?? 0),
        baseUnitQuantity: Number(item.baseUnitQuantity ?? 0),
      })),
    })),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedMaterialIssues['meta'] {
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

/** `GET /material-issues` — `stock.view` */
export async function fetchMaterialIssues(
  query: ListMaterialIssuesQuery = {},
): Promise<PaginatedMaterialIssues> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicMaterialIssue[]>(BASE, {
    page,
    limit,
    search: query.search,
    projectId: query.projectId,
    status: query.status,
    contractorId: query.contractorId,
    boqItemId: query.boqItemId,
  });
  return {
    items: (res.data ?? []).map(normaliseIssue),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /material-issues/:id` — `stock.view` */
export async function fetchMaterialIssue(
  id: string,
): Promise<PublicMaterialIssue> {
  const res = await apiGet<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Material issue unavailable');
  }
  return normaliseIssue(res.data);
}

/** `POST /material-issues` — `stock.issue` */
export async function createMaterialIssue(
  input: CreateMaterialIssueInput,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create material issue failed');
  }
  return normaliseIssue(res.data);
}

/** `PATCH /material-issues/:id` — `stock.issue` */
export async function updateMaterialIssue(
  id: string,
  input: UpdateMaterialIssueInput,
): Promise<PublicMaterialIssue> {
  const res = await apiPatch<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update material issue failed');
  }
  return normaliseIssue(res.data);
}

/** `POST /material-issues/:id/signatures` — `stock.issue` */
export async function attachMaterialIssueSignatures(
  id: string,
  input: AttachSignaturesInput,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}/signatures`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Attach signatures failed');
  }
  return normaliseIssue(res.data);
}

/** `POST /material-issues/:id/submit` — `stock.issue` */
export async function submitMaterialIssue(
  id: string,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit material issue failed');
  }
  return normaliseIssue(res.data);
}

/** `POST /material-issues/:id/confirm` — `stock.adjust` */
export async function confirmMaterialIssue(
  id: string,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}/confirm`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Confirm material issue failed');
  }
  return normaliseIssue(res.data);
}

/** `POST /material-issues/:id/returns` — `stock.issue` */
export async function createMaterialReturn(
  id: string,
  input: CreateMaterialReturnInput,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}/returns`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create material return failed');
  }
  return normaliseIssue(res.data);
}

/** `POST /material-issues/:id/cancel` — `stock.issue` */
export async function cancelMaterialIssue(
  id: string,
): Promise<PublicMaterialIssue> {
  const res = await apiPost<PublicMaterialIssue>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel material issue failed');
  }
  return normaliseIssue(res.data);
}

/** `GET /stock-ledger/balance` — `stock.view` */
export async function fetchAvailableStock(query: {
  projectId: string;
  materialId: string;
  location?: string;
}): Promise<{ quantityInBaseUnit: number; baseUnit: string }> {
  const res = await apiGet<{
    quantityInBaseUnit: number;
    baseUnit: string;
  }>('/stock-ledger/balance', {
    projectId: query.projectId,
    materialId: query.materialId,
    location: query.location || undefined,
  });
  if (!res.data) {
    throw new Error(res.message || 'Stock balance unavailable');
  }
  return {
    quantityInBaseUnit: Number(res.data.quantityInBaseUnit ?? 0),
    baseUnit: res.data.baseUnit,
  };
}

/** `GET /materials` — `material.view` */
export async function fetchMaterialsForIssue(query: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PublicMaterialOption[]> {
  const res = await apiGet<PublicMaterialOption[]>('/materials', {
    page: query.page ?? 1,
    limit: query.limit ?? 50,
    search: query.search,
    status: 'active',
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    materialCode: row.materialCode,
    name: row.name,
    baseUnit: row.baseUnit,
    status: row.status,
  }));
}

/** `GET /boq/projects/:projectId/items` — `boq.view` */
export async function fetchBoqItemsForIssue(query: {
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

/** `GET /users` — `user.view` */
export async function fetchUsersForIssue(
  projectId?: string,
): Promise<MaterialIssueUserOption[]> {
  const res = await apiGet<MaterialIssueUserOption[]>('/users', {
    page: 1,
    limit: 100,
    status: 'active',
    projectId: projectId || undefined,
  });
  return res.data ?? [];
}
