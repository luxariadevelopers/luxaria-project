import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPost } from '@/api/client';
import type {
  EvaluateShortfallQuery,
  ListPaginationMeta,
  ListShortfallAlertsQuery,
  PaginatedShortfallAlerts,
  PublicManpowerComparison,
  PublicManpowerShortfallAlert,
} from './types';

export type EvaluateShortfallOutcome = {
  asOf: string | Date;
  created: number;
  updated: number;
  alerts: PublicManpowerShortfallAlert[];
};

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

function normaliseAlert(
  row: PublicManpowerShortfallAlert,
): PublicManpowerShortfallAlert {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    agreementId: row.agreementId ? String(row.agreementId) : null,
    agreementNumber: row.agreementNumber ?? null,
    asOfDate: toIso(row.asOfDate) ?? String(row.asOfDate),
    shortfallPercent: Number(row.shortfallPercent ?? 0),
    consecutiveDays: Number(row.consecutiveDays ?? 0),
    agreementHeadcount: Number(row.agreementHeadcount ?? 0),
    plannedHeadcount: Number(row.plannedHeadcount ?? 0),
    actualHeadcount: Number(row.actualHeadcount ?? 0),
    skillGaps: (row.skillGaps ?? []).map((gap) => ({
      ...gap,
      committedHeadcount: Number(gap.committedHeadcount ?? 0),
      plannedHeadcount: Number(gap.plannedHeadcount ?? 0),
      actualHeadcount: Number(gap.actualHeadcount ?? 0),
      isCritical: Boolean(gap.isCritical),
      missing: Boolean(gap.missing),
    })),
    expectedScheduleImpactDays: Number(row.expectedScheduleImpactDays ?? 0),
    acknowledged: Boolean(row.acknowledged),
    acknowledgedBy: row.acknowledgedBy ? String(row.acknowledgedBy) : null,
    acknowledgedAt: toIso(row.acknowledgedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /manpower-planning/shortfall-alerts` — `manpower_shortfall.view` */
export async function fetchShortfallAlerts(
  query: ListShortfallAlertsQuery = {},
): Promise<PaginatedShortfallAlerts> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicManpowerShortfallAlert[]>(
    '/manpower-planning/shortfall-alerts',
    {
      page,
      limit,
      projectId: query.projectId,
      contractorId: query.contractorId,
      alertType: query.alertType,
      unacknowledgedOnly: query.unacknowledgedOnly,
    },
  );
  return {
    items: (res.data ?? []).map(normaliseAlert),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `POST /manpower-planning/shortfall-alerts/evaluate` — `manpower_shortfall.acknowledge` */
export async function evaluateShortfallAlerts(
  query: EvaluateShortfallQuery = {},
): Promise<EvaluateShortfallOutcome> {
  const { data: res } = await apiClient.post<
    ApiResponse<EvaluateShortfallOutcome>
  >('/manpower-planning/shortfall-alerts/evaluate', undefined, {
    params: {
      asOf: query.asOf,
      projectId: query.projectId,
      contractorId: query.contractorId,
    },
  });
  if (!res.data) {
    throw new Error(res.message || 'Shortfall evaluation failed');
  }
  return {
    asOf: res.data.asOf,
    created: Number(res.data.created ?? 0),
    updated: Number(res.data.updated ?? 0),
    alerts: (res.data.alerts ?? []).map(normaliseAlert),
  };
}

/** `POST /manpower-planning/shortfall-alerts/:id/acknowledge` — `manpower_shortfall.acknowledge` */
export async function acknowledgeShortfallAlert(
  id: string,
): Promise<PublicManpowerShortfallAlert> {
  const res = await apiPost<PublicManpowerShortfallAlert>(
    `/manpower-planning/shortfall-alerts/${id}/acknowledge`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Acknowledge shortfall alert failed');
  }
  return normaliseAlert(res.data);
}

/** `GET /manpower-planning/compare` — `manpower_plan.view` */
export async function fetchManpowerComparison(query: {
  projectId: string;
  contractorId: string;
  asOfDate: string;
}): Promise<PublicManpowerComparison> {
  const res = await apiGet<PublicManpowerComparison>(
    '/manpower-planning/compare',
    {
      projectId: query.projectId,
      contractorId: query.contractorId,
      asOfDate: query.asOfDate,
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Manpower comparison unavailable');
  }
  const row = res.data;
  return {
    ...row,
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    asOfDate: String(row.asOfDate).slice(0, 10),
    agreementId: row.agreementId ? String(row.agreementId) : null,
    agreementHeadcount: Number(row.agreementHeadcount ?? 0),
    plannedHeadcount: Number(row.plannedHeadcount ?? 0),
    actualHeadcount: Number(row.actualHeadcount ?? 0),
    shortfallPercent: Number(row.shortfallPercent ?? 0),
    fillRatePercent: Number(row.fillRatePercent ?? 0),
    attendanceSubmitted: Boolean(row.attendanceSubmitted),
    skillMix: (row.skillMix ?? []).map((gap) => ({
      ...gap,
      committedHeadcount: Number(gap.committedHeadcount ?? 0),
      plannedHeadcount: Number(gap.plannedHeadcount ?? 0),
      actualHeadcount: Number(gap.actualHeadcount ?? 0),
      isCritical: Boolean(gap.isCritical),
      missing: Boolean(gap.missing),
    })),
    workProgress: {
      behind: Boolean(row.workProgress?.behind),
      expectedRatio: Number(row.workProgress?.expectedRatio ?? 0),
      actualRatio: Number(row.workProgress?.actualRatio ?? 0),
      progressShortfallPercent: Number(
        row.workProgress?.progressShortfallPercent ?? 0,
      ),
      expectedScheduleImpactDays: Number(
        row.workProgress?.expectedScheduleImpactDays ?? 0,
      ),
    },
  };
}
