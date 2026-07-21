import { apiGet, apiPost } from '@/api/client';
import type {
  ApproveDprInput,
  ListDailyProgressReportsQuery,
  PaginatedDailyProgressReports,
  PublicDailyProgressReport,
  PublicMissingDprAlert,
  ReopenDprInput,
  ReviewDprInput,
  VerifyDprInput,
} from './types';
import { DprShift } from './types';

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
    siteId: row.siteId == null ? null : String(row.siteId),
    zoneSiteId: row.zoneSiteId == null ? null : String(row.zoneSiteId),
    blockSiteId: row.blockSiteId == null ? null : String(row.blockSiteId),
    towerSiteId: row.towerSiteId == null ? null : String(row.towerSiteId),
    floorSiteId: row.floorSiteId == null ? null : String(row.floorSiteId),
    unitId: row.unitId == null ? null : String(row.unitId),
    locationSiteIds: (row.locationSiteIds ?? []).map(String),
    reportDate: toIso(row.reportDate) ?? String(row.reportDate),
    shift: row.shift ?? DprShift.General,
    weatherNotes: row.weatherNotes ?? null,
    staffPresent: (row.staffPresent ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      name: entry.name,
      role: entry.role ?? null,
      present: entry.present !== false,
    })),
    labourCount: Number(row.labourCount ?? 0),
    skilledLabourCount: Number(row.skilledLabourCount ?? 0),
    unskilledLabourCount: Number(row.unskilledLabourCount ?? 0),
    workPerformed: row.workPerformed ?? null,
    plannedWork: row.plannedWork ?? null,
    delayedWork: row.delayedWork ?? null,
    boqQuantities: (row.boqQuantities ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      boqItemId: String(entry.boqItemId),
      boqCode: entry.boqCode ?? null,
      description: entry.description ?? null,
      unit: entry.unit ?? null,
      quantityCompleted: Number(entry.quantityCompleted ?? 0),
      notes: entry.notes ?? null,
    })),
    materialsReceived: (row.materialsReceived ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      materialId:
        entry.materialId == null ? null : String(entry.materialId),
      materialName: entry.materialName,
      quantity: Number(entry.quantity ?? 0),
      unit: entry.unit ?? null,
      reference: entry.reference ?? null,
    })),
    materialsIssued: (row.materialsIssued ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      materialId:
        entry.materialId == null ? null : String(entry.materialId),
      materialName: entry.materialName,
      quantity: Number(entry.quantity ?? 0),
      unit: entry.unit ?? null,
      reference: entry.reference ?? null,
    })),
    equipmentUsed: (row.equipmentUsed ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      name: entry.name,
      hours: Number(entry.hours ?? 0),
      notes: entry.notes ?? null,
    })),
    delays: (row.delays ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      reason: entry.reason,
      hoursLost: Number(entry.hoursLost ?? 0),
      notes: entry.notes ?? null,
    })),
    safetyIssues: (row.safetyIssues ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      description: entry.description,
      severity: entry.severity,
      actionTaken: entry.actionTaken ?? null,
    })),
    qualityIssues: (row.qualityIssues ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      description: entry.description,
      severity: entry.severity,
      actionTaken: entry.actionTaken ?? null,
    })),
    decisionsRequired: (row.decisionsRequired ?? []).map((entry) => ({
      id: String(entry.id ?? ''),
      description: entry.description,
      owner: entry.owner ?? null,
      dueDate: toIso(entry.dueDate),
    })),
    tomorrowPlan: row.tomorrowPlan ?? null,
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    videoDocumentIds: (row.videoDocumentIds ?? []).map(String),
    materialIssueIds: (row.materialIssueIds ?? []).map(String),
    stockReservationIds: (row.stockReservationIds ?? []).map(String),
    labourAttendanceIds: (row.labourAttendanceIds ?? []).map(String),
    workMeasurementIds: (row.workMeasurementIds ?? []).map(String),
    equipmentUtilizationIds: (row.equipmentUtilizationIds ?? []).map(String),
    diaryEntryIds: (row.diaryEntryIds ?? []).map(String),
    qualityObservationIds: (row.qualityObservationIds ?? []).map(String),
    safetyIncidentIds: (row.safetyIncidentIds ?? []).map(String),
    siteIssueIds: (row.siteIssueIds ?? []).map(String),
    drawingIds: (row.drawingIds ?? []).map(String),
    siteCashBalance: Number(row.siteCashBalance ?? 0),
    siteCashAccountId:
      row.siteCashAccountId == null ? null : String(row.siteCashAccountId),
    pdfDocumentId: row.pdfDocumentId == null ? null : String(row.pdfDocumentId),
    clientDeviceId: row.clientDeviceId ?? null,
    offlineCapturedAt: toIso(row.offlineCapturedAt),
    submittedBy: row.submittedBy == null ? null : String(row.submittedBy),
    submittedAt: toIso(row.submittedAt),
    verifiedBy: row.verifiedBy == null ? null : String(row.verifiedBy),
    verifiedAt: toIso(row.verifiedAt),
    verifyNotes: row.verifyNotes ?? null,
    reviewedBy: row.reviewedBy == null ? null : String(row.reviewedBy),
    reviewedAt: toIso(row.reviewedAt),
    reviewNotes: row.reviewNotes ?? null,
    approvedBy: row.approvedBy == null ? null : String(row.approvedBy),
    approvedAt: toIso(row.approvedAt),
    approveNotes: row.approveNotes ?? null,
    lockedBy: row.lockedBy == null ? null : String(row.lockedBy),
    lockedAt: toIso(row.lockedAt),
    reopenedBy: row.reopenedBy == null ? null : String(row.reopenedBy),
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
      siteId: query.siteId || undefined,
      shift: query.shift || undefined,
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

/** `GET /daily-progress-reports/:id` — `dpr.view` */
export async function fetchDailyProgressReport(
  id: string,
): Promise<PublicDailyProgressReport> {
  const res = await apiGet<PublicDailyProgressReport>(
    `/daily-progress-reports/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Daily progress report unavailable');
  }
  return normaliseDpr(res.data);
}

/** `POST /daily-progress-reports/:id/verify` — `dpr.review` */
export async function verifyDailyProgressReport(
  id: string,
  input: VerifyDprInput = {},
): Promise<PublicDailyProgressReport> {
  const res = await apiPost<PublicDailyProgressReport>(
    `/daily-progress-reports/${encodeURIComponent(id)}/verify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to verify daily progress report');
  }
  return normaliseDpr(res.data);
}

/** `POST /daily-progress-reports/:id/approve` — `dpr.review` */
export async function approveDailyProgressReport(
  id: string,
  input: ApproveDprInput = {},
): Promise<PublicDailyProgressReport> {
  const res = await apiPost<PublicDailyProgressReport>(
    `/daily-progress-reports/${encodeURIComponent(id)}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to approve daily progress report');
  }
  return normaliseDpr(res.data);
}

/** `POST /daily-progress-reports/:id/lock` — `dpr.review` */
export async function lockDailyProgressReport(
  id: string,
): Promise<PublicDailyProgressReport> {
  const res = await apiPost<PublicDailyProgressReport>(
    `/daily-progress-reports/${encodeURIComponent(id)}/lock`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to lock daily progress report');
  }
  return normaliseDpr(res.data);
}

/** `POST /daily-progress-reports/:id/review` — `dpr.review` (legacy → approved-like) */
export async function reviewDailyProgressReport(
  id: string,
  input: ReviewDprInput,
): Promise<PublicDailyProgressReport> {
  const res = await apiPost<PublicDailyProgressReport>(
    `/daily-progress-reports/${encodeURIComponent(id)}/review`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to review daily progress report');
  }
  return normaliseDpr(res.data);
}

/** `POST /daily-progress-reports/:id/reopen` — `dpr.review` */
export async function reopenDailyProgressReport(
  id: string,
  input: ReopenDprInput,
): Promise<PublicDailyProgressReport> {
  const res = await apiPost<PublicDailyProgressReport>(
    `/daily-progress-reports/${encodeURIComponent(id)}/reopen`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to reopen daily progress report');
  }
  return normaliseDpr(res.data);
}

/** `POST /daily-progress-reports/:id/regenerate-pdf` — `dpr.review` */
export async function regenerateDprPdf(
  id: string,
): Promise<PublicDailyProgressReport> {
  const res = await apiPost<PublicDailyProgressReport>(
    `/daily-progress-reports/${encodeURIComponent(id)}/regenerate-pdf`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to regenerate DPR PDF');
  }
  return normaliseDpr(res.data);
}

export function mediaCount(row: PublicDailyProgressReport): number {
  return (
    (row.photoDocumentIds?.length ?? 0) + (row.videoDocumentIds?.length ?? 0)
  );
}
