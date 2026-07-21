import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateManpowerDailyPlanInput,
  ListManpowerPlansQuery,
  ListPaginationMeta,
  PaginatedManpowerPlans,
  PublicManpowerDailyPlan,
  PublicManpowerPlanSkillLine,
  UpdateManpowerDailyPlanInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
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

function normaliseSkillLine(
  line: PublicManpowerPlanSkillLine,
): PublicManpowerPlanSkillLine {
  return {
    ...line,
    id: String(line.id ?? ''),
    labourCategoryId: line.labourCategoryId
      ? String(line.labourCategoryId)
      : null,
    skill: line.skill,
    plannedHeadcount: Number(line.plannedHeadcount ?? 0),
    isCritical: Boolean(line.isCritical),
  };
}

function normalisePlan(row: PublicManpowerDailyPlan): PublicManpowerDailyPlan {
  const planDate = toIso(row.planDate) ?? String(row.planDate);
  return {
    ...row,
    id: String(row.id),
    planNumber: row.planNumber,
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    agreementId: row.agreementId ? String(row.agreementId) : null,
    planDate: planDate.slice(0, 10),
    plannedHeadcount: Number(row.plannedHeadcount ?? 0),
    skillMix: (row.skillMix ?? []).map(normaliseSkillLine),
    notes: row.notes ?? null,
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /manpower-planning/plans` — `manpower_plan.view` */
export async function fetchManpowerPlans(
  query: ListManpowerPlansQuery = {},
): Promise<PaginatedManpowerPlans> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicManpowerDailyPlan[]>(
    '/manpower-planning/plans',
    {
      page,
      limit,
      projectId: query.projectId,
      contractorId: query.contractorId,
      planDate: query.planDate,
      fromDate: query.fromDate,
      toDate: query.toDate,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    },
  );
  return {
    items: (res.data ?? []).map(normalisePlan),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /manpower-planning/plans/:id` — `manpower_plan.view` */
export async function fetchManpowerPlan(id: string): Promise<PublicManpowerDailyPlan> {
  const res = await apiGet<PublicManpowerDailyPlan>(
    `/manpower-planning/plans/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Manpower plan not found');
  }
  return normalisePlan(res.data);
}

/** `POST /manpower-planning/plans` — `manpower_plan.manage` */
export async function createManpowerPlan(
  input: CreateManpowerDailyPlanInput,
): Promise<PublicManpowerDailyPlan> {
  const res = await apiPost<PublicManpowerDailyPlan>(
    '/manpower-planning/plans',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create manpower plan failed');
  }
  return normalisePlan(res.data);
}

/** `PATCH /manpower-planning/plans/:id` — `manpower_plan.manage` */
export async function updateManpowerPlan(
  id: string,
  input: UpdateManpowerDailyPlanInput,
): Promise<PublicManpowerDailyPlan> {
  const res = await apiPatch<PublicManpowerDailyPlan>(
    `/manpower-planning/plans/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update manpower plan failed');
  }
  return normalisePlan(res.data);
}
