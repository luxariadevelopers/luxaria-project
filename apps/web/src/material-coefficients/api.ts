import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ApproveMaterialCoefficientInput,
  CreateMaterialCoefficientInput,
  ListMaterialCoefficientsQuery,
  PaginatedMaterialCoefficients,
  PublicMaterialCoefficient,
  RejectMaterialCoefficientInput,
  ResolveMaterialCoefficientQuery,
  UpdateMaterialCoefficientInput,
} from './types';

const BASE = '/material-consumption-standards';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseCoefficient(
  row: PublicMaterialCoefficient,
): PublicMaterialCoefficient {
  return {
    ...row,
    effectiveDate: toIso(row.effectiveDate) ?? row.effectiveDate,
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedMaterialCoefficients['meta'] {
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

/** `GET /material-consumption-standards` — `material_consumption.view` */
export async function fetchMaterialCoefficients(
  query: ListMaterialCoefficientsQuery = {},
): Promise<PaginatedMaterialCoefficients> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicMaterialCoefficient[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    globalOnly: query.globalOnly,
    boqItemId: query.boqItemId,
    workType: query.workType,
    materialId: query.materialId,
    outputUnit: query.outputUnit,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseCoefficient),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /material-consumption-standards/:id` — `material_consumption.view` */
export async function fetchMaterialCoefficient(
  id: string,
): Promise<PublicMaterialCoefficient> {
  const res = await apiGet<PublicMaterialCoefficient>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Material consumption standard unavailable');
  }
  return normaliseCoefficient(res.data);
}

/** `GET /material-consumption-standards/resolve` — `material_consumption.view` */
export async function resolveMaterialCoefficient(
  query: ResolveMaterialCoefficientQuery,
): Promise<PublicMaterialCoefficient | null> {
  const res = await apiGet<PublicMaterialCoefficient | null>(`${BASE}/resolve`, {
    projectId: query.projectId,
    boqItemId: query.boqItemId,
    workType: query.workType,
    materialId: query.materialId,
    outputUnit: query.outputUnit,
    asOf: query.asOf,
  });
  return res.data ? normaliseCoefficient(res.data) : null;
}

/** `POST /material-consumption-standards` — `material_consumption.manage` */
export async function createMaterialCoefficient(
  input: CreateMaterialCoefficientInput,
): Promise<PublicMaterialCoefficient> {
  const res = await apiPost<PublicMaterialCoefficient>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create material consumption standard failed');
  }
  return normaliseCoefficient(res.data);
}

/** `PATCH /material-consumption-standards/:id` — `material_consumption.manage` */
export async function updateMaterialCoefficient(
  id: string,
  input: UpdateMaterialCoefficientInput,
): Promise<PublicMaterialCoefficient> {
  const res = await apiPatch<PublicMaterialCoefficient>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update material consumption standard failed');
  }
  return normaliseCoefficient(res.data);
}

/** `POST /material-consumption-standards/:id/versions` — `material_consumption.manage` */
export async function createMaterialCoefficientVersion(
  id: string,
): Promise<PublicMaterialCoefficient> {
  const res = await apiPost<PublicMaterialCoefficient>(
    `${BASE}/${encodeURIComponent(id)}/versions`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create next version failed');
  }
  return normaliseCoefficient(res.data);
}

/** `POST /material-consumption-standards/:id/submit` — `material_consumption.manage` */
export async function submitMaterialCoefficient(
  id: string,
): Promise<PublicMaterialCoefficient> {
  const res = await apiPost<PublicMaterialCoefficient>(
    `${BASE}/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit for approval failed');
  }
  return normaliseCoefficient(res.data);
}

/** `POST /material-consumption-standards/:id/approve` — `material_consumption.approve` */
export async function approveMaterialCoefficient(
  id: string,
  input: ApproveMaterialCoefficientInput,
): Promise<PublicMaterialCoefficient> {
  const res = await apiPost<PublicMaterialCoefficient>(
    `${BASE}/${encodeURIComponent(id)}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve material consumption standard failed');
  }
  return normaliseCoefficient(res.data);
}

/** `POST /material-consumption-standards/:id/reject` — `material_consumption.approve` */
export async function rejectMaterialCoefficient(
  id: string,
  input: RejectMaterialCoefficientInput,
): Promise<PublicMaterialCoefficient> {
  const res = await apiPost<PublicMaterialCoefficient>(
    `${BASE}/${encodeURIComponent(id)}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reject material consumption standard failed');
  }
  return normaliseCoefficient(res.data);
}

/** `GET /materials` — `material.view` (picker). */
export async function fetchMaterialOptions(query: {
  search?: string;
  limit?: number;
}): Promise<
  Array<{ id: string; materialCode: string; name: string; status: string }>
> {
  const res = await apiGet<
    Array<{ id: string; materialCode: string; name: string; status: string }>
  >('/materials', {
    page: 1,
    limit: query.limit ?? 20,
    search: query.search?.trim() || undefined,
  });
  return res.data ?? [];
}
