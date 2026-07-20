import { apiGet } from '@/api/client';
import type {
  ListDailyProgressReportsQuery,
  PaginatedDailyProgressReports,
  PublicDailyProgressReport,
  PublicMissingDprAlert,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseDpr(row: PublicDailyProgressReport): PublicDailyProgressReport {
  return {
    ...row,
    id: String(row.id),
    dprNumber: row.dprNumber,
    projectId: String(row.projectId),
    reportDate: toIso(row.reportDate) ?? String(row.reportDate),
    weatherNotes: row.weatherNotes ?? null,
    labourCount: Number(row.labourCount ?? 0),
    skilledLabourCount: Number(row.skilledLabourCount ?? 0),
    unskilledLabourCount: Number(row.unskilledLabourCount ?? 0),
    workPerformed: row.workPerformed ?? null,
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    videoDocumentIds: (row.videoDocumentIds ?? []).map(String),
    siteCashBalance: Number(row.siteCashBalance ?? 0),
    pdfDocumentId: row.pdfDocumentId == null ? null : String(row.pdfDocumentId),
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    reviewNotes: row.reviewNotes ?? null,
    reopenedAt: toIso(row.reopenedAt),
    reopenReason: row.reopenReason ?? null,
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function normaliseMissingAlert(
  row: PublicMissingDprAlert,
): PublicMissingDprAlert {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    reportDate: toIso(row.reportDate) ?? String(row.reportDate),
    message: row.message ?? '',
    acknowledged: Boolean(row.acknowledged),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedDailyProgressReports['meta'] {
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

/** `GET /daily-progress-reports` — `dpr.view` */
export async function fetchDailyProgressReports(
  query: ListDailyProgressReportsQuery = {},
): Promise<PaginatedDailyProgressReports> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicDailyProgressReport[]>(
    '/daily-progress-reports',
    {
      page,
      limit,
      projectId: query.projectId,
      status: query.status || undefined,
      fromDate: query.fromDate || undefined,
      toDate: query.toDate || undefined,
    },
  );
  return {
    items: (res.data ?? []).map(normaliseDpr),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /daily-progress-reports/missing-alerts` — `dpr.view` */
export async function fetchMissingDprAlerts(
  projectId?: string,
): Promise<PublicMissingDprAlert[]> {
  const res = await apiGet<PublicMissingDprAlert[]>(
    '/daily-progress-reports/missing-alerts',
    { projectId },
  );
  return (res.data ?? []).map(normaliseMissingAlert);
}

export function mediaCount(row: PublicDailyProgressReport): number {
  return (
    (row.photoDocumentIds?.length ?? 0) + (row.videoDocumentIds?.length ?? 0)
  );
}
