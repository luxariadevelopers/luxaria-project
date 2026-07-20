import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateLabourCategoryInput,
  CreateLabourCategoryRateInput,
  ListLabourCategoriesQuery,
  ListLabourCategoryRatesQuery,
  ListPaginationMeta,
  PaginatedLabourCategories,
  PaginatedLabourCategoryRates,
  PublicLabourCategory,
  PublicLabourCategoryRate,
  PublicResolvedLabourRate,
  ResolveLabourCategoryRateQuery,
  SeedStandardResult,
  UpdateLabourCategoryInput,
  UpdateLabourCategoryRateInput,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toIsoRequired(value: unknown, fallback = ''): string {
  return toIso(value) ?? fallback;
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): ListPaginationMeta | null {
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

function normaliseCategory(row: PublicLabourCategory): PublicLabourCategory {
  return {
    ...row,
    id: String(row.id),
    defaultDailyRate: Number(row.defaultDailyRate ?? 0),
    overtimeRate: Number(row.overtimeRate ?? 0),
    isSystem: Boolean(row.isSystem),
    notes: row.notes ?? null,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function normaliseRate(row: PublicLabourCategoryRate): PublicLabourCategoryRate {
  return {
    ...row,
    id: String(row.id),
    labourCategoryId: String(row.labourCategoryId),
    projectId: row.projectId ? String(row.projectId) : null,
    contractorId: row.contractorId ? String(row.contractorId) : null,
    dailyRate: Number(row.dailyRate ?? 0),
    overtimeRate: Number(row.overtimeRate ?? 0),
    effectiveDate: toIsoRequired(row.effectiveDate),
    notes: row.notes ?? null,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function normaliseResolved(
  row: PublicResolvedLabourRate,
): PublicResolvedLabourRate {
  return {
    ...row,
    labourCategoryId: String(row.labourCategoryId),
    dailyRate: Number(row.dailyRate ?? 0),
    overtimeRate: Number(row.overtimeRate ?? 0),
    rateId: row.rateId ? String(row.rateId) : null,
    projectId: row.projectId ? String(row.projectId) : null,
    contractorId: row.contractorId ? String(row.contractorId) : null,
    effectiveDate: row.effectiveDate ? toIsoRequired(row.effectiveDate) : null,
    asOf: toIsoRequired(row.asOf),
  };
}

/** `GET /labour-categories` — `labour_category.view` */
export async function fetchLabourCategories(
  query: ListLabourCategoriesQuery = {},
): Promise<PaginatedLabourCategories> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicLabourCategory[]>('/labour-categories', {
    page,
    limit,
    status: query.status,
    skillLevel: query.skillLevel,
    search: query.search,
  });
  return {
    items: (res.data ?? []).map(normaliseCategory),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /labour-categories/:id` — `labour_category.view` */
export async function fetchLabourCategory(
  id: string,
): Promise<PublicLabourCategory> {
  const res = await apiGet<PublicLabourCategory>(`/labour-categories/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Labour category unavailable');
  }
  return normaliseCategory(res.data);
}

/** `POST /labour-categories` — `labour_category.manage` */
export async function createLabourCategory(
  input: CreateLabourCategoryInput,
): Promise<PublicLabourCategory> {
  const res = await apiPost<PublicLabourCategory>('/labour-categories', input);
  if (!res.data) {
    throw new Error(res.message || 'Create labour category failed');
  }
  return normaliseCategory(res.data);
}

/** `PATCH /labour-categories/:id` — `labour_category.manage` */
export async function updateLabourCategory(
  id: string,
  input: UpdateLabourCategoryInput,
): Promise<PublicLabourCategory> {
  const res = await apiPatch<PublicLabourCategory>(
    `/labour-categories/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update labour category failed');
  }
  return normaliseCategory(res.data);
}

/** `POST /labour-categories/:id/activate` — `labour_category.manage` */
export async function activateLabourCategory(
  id: string,
): Promise<PublicLabourCategory> {
  const res = await apiPost<PublicLabourCategory>(
    `/labour-categories/${id}/activate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Activate failed');
  }
  return normaliseCategory(res.data);
}

/** `POST /labour-categories/:id/deactivate` — `labour_category.manage` */
export async function deactivateLabourCategory(
  id: string,
): Promise<PublicLabourCategory> {
  const res = await apiPost<PublicLabourCategory>(
    `/labour-categories/${id}/deactivate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Deactivate failed');
  }
  return normaliseCategory(res.data);
}

/** `POST /labour-categories/seed-standard` — `labour_category.manage` */
export async function seedStandardLabourCategories(): Promise<SeedStandardResult> {
  const res = await apiPost<SeedStandardResult>(
    '/labour-categories/seed-standard',
  );
  if (!res.data) {
    throw new Error(res.message || 'Seed failed');
  }
  return res.data;
}

/** `GET /labour-categories/:id/rates` — `labour_category.view` */
export async function fetchLabourCategoryRates(
  categoryId: string,
  query: ListLabourCategoryRatesQuery = {},
): Promise<PaginatedLabourCategoryRates> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 100;
  const res = await apiGet<PublicLabourCategoryRate[]>(
    `/labour-categories/${categoryId}/rates`,
    {
      page,
      limit,
      projectId: query.projectId,
      contractorId: query.contractorId,
      status: query.status,
    },
  );
  return {
    items: (res.data ?? []).map(normaliseRate),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `POST /labour-categories/:id/rates` — `labour_category.manage` */
export async function createLabourCategoryRate(
  categoryId: string,
  input: CreateLabourCategoryRateInput,
): Promise<PublicLabourCategoryRate> {
  const res = await apiPost<PublicLabourCategoryRate>(
    `/labour-categories/${categoryId}/rates`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create rate override failed');
  }
  return normaliseRate(res.data);
}

/** `PATCH /labour-categories/rates/:rateId` — `labour_category.manage` */
export async function updateLabourCategoryRate(
  rateId: string,
  input: UpdateLabourCategoryRateInput,
): Promise<PublicLabourCategoryRate> {
  const res = await apiPatch<PublicLabourCategoryRate>(
    `/labour-categories/rates/${rateId}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update rate override failed');
  }
  return normaliseRate(res.data);
}

/** `GET /labour-categories/resolve-rate` — `labour_category.view` */
export async function resolveLabourCategoryRate(
  query: ResolveLabourCategoryRateQuery,
): Promise<PublicResolvedLabourRate> {
  const res = await apiGet<PublicResolvedLabourRate>(
    '/labour-categories/resolve-rate',
    {
      labourCategoryId: query.labourCategoryId,
      projectId: query.projectId,
      contractorId: query.contractorId,
      asOf: query.asOf,
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Resolve rate failed');
  }
  return normaliseResolved(res.data);
}
