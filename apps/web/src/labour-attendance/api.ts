import { apiClient, apiGet, apiPost } from '@/api/client';
import type {
  CreateLabourAttendanceInput,
  DailyAttendanceReportQuery,
  ListLabourAttendanceQuery,
  ListPaginationMeta,
  PaginatedLabourAttendance,
  PublicDailyAttendanceReport,
  PublicLabourAttendance,
} from './types';
import { LabourAttendanceShift } from './types';

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

function normaliseAttendance(
  row: PublicLabourAttendance,
): PublicLabourAttendance {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    siteId: row.siteId ? String(row.siteId) : null,
    contractorId: String(row.contractorId),
    dprId: row.dprId ? String(row.dprId) : null,
    attendanceDate: toIso(row.attendanceDate) ?? String(row.attendanceDate),
    shift: row.shift ?? LabourAttendanceShift.General,
    workLocation: row.workLocation ?? null,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    lines: (row.lines ?? []).map((line) => ({
      ...line,
      id: String(line.id ?? ''),
      labourCategoryId: String(line.labourCategoryId),
      labourCategoryCode: line.labourCategoryCode ?? null,
      labourCategoryName: line.labourCategoryName ?? null,
      workerCount: Number(line.workerCount ?? 0),
      overtimeHours: Number(line.overtimeHours ?? 0),
      workers: (line.workers ?? []).map((worker) => {
        const checkIn = toIso(worker.checkIn ?? worker.checkInAt);
        const checkOut = toIso(worker.checkOut ?? worker.checkOutAt);
        return {
          ...worker,
          id: String(worker.id ?? ''),
          workerCode: worker.workerCode ?? null,
          checkIn,
          checkOut,
          checkInAt: checkIn,
          checkOutAt: checkOut,
          overtimeHours: Number(worker.overtimeHours ?? 0),
          remarks: worker.remarks ?? null,
        };
      }),
      remarks: line.remarks ?? null,
    })),
    groupPhotoDocumentIds: (row.groupPhotoDocumentIds ?? []).map(String),
    remarks: row.remarks ?? null,
    totalWorkers: Number(row.totalWorkers ?? 0),
    totalOvertimeHours: Number(row.totalOvertimeHours ?? 0),
    clientDeviceId: row.clientDeviceId ?? null,
    offlineCapturedAt: toIso(row.offlineCapturedAt),
    submittedBy: row.submittedBy ? String(row.submittedBy) : null,
    submittedAt: toIso(row.submittedAt),
    supervisorConfirmed: Boolean(row.supervisorConfirmed),
    confirmedBy: row.confirmedBy ? String(row.confirmedBy) : null,
    confirmedAt: toIso(row.confirmedAt),
    confirmationNotes: row.confirmationNotes ?? null,
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /labour-attendance` — `attendance.view` */
export async function fetchLabourAttendanceList(
  query: ListLabourAttendanceQuery = {},
): Promise<PaginatedLabourAttendance> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicLabourAttendance[]>('/labour-attendance', {
    page,
    limit,
    projectId: query.projectId,
    siteId: query.siteId,
    contractorId: query.contractorId,
    dprId: query.dprId,
    attendanceDate: query.attendanceDate,
    fromDate: query.fromDate,
    toDate: query.toDate,
    shift: query.shift,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseAttendance),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /labour-attendance/:id` — `attendance.view` */
export async function fetchLabourAttendance(
  id: string,
): Promise<PublicLabourAttendance> {
  const res = await apiGet<PublicLabourAttendance>(`/labour-attendance/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Labour attendance unavailable');
  }
  return normaliseAttendance(res.data);
}

function normaliseDailyReport(
  data: PublicDailyAttendanceReport,
): PublicDailyAttendanceReport {
  return {
    ...data,
    projectId: String(data.projectId),
    siteId: data.siteId ? String(data.siteId) : null,
    attendanceDate: String(data.attendanceDate).slice(0, 10),
    shift: data.shift ?? null,
    sheetCount: Number(data.sheetCount ?? 0),
    totalWorkers: Number(data.totalWorkers ?? 0),
    totalOvertimeHours: Number(data.totalOvertimeHours ?? 0),
    confirmedCount: Number(data.confirmedCount ?? 0),
    pendingConfirmationCount: Number(data.pendingConfirmationCount ?? 0),
    sheets: (data.sheets ?? []).map((sheet) => ({
      ...sheet,
      id: String(sheet.id),
      siteId: sheet.siteId ? String(sheet.siteId) : null,
      contractorId: String(sheet.contractorId),
      dprId: sheet.dprId ? String(sheet.dprId) : null,
      shift: sheet.shift ?? LabourAttendanceShift.General,
      latitude: sheet.latitude == null ? null : Number(sheet.latitude),
      longitude: sheet.longitude == null ? null : Number(sheet.longitude),
      totalWorkers: Number(sheet.totalWorkers ?? 0),
      totalOvertimeHours: Number(sheet.totalOvertimeHours ?? 0),
      byCategory: (sheet.byCategory ?? []).map((cat) => ({
        ...cat,
        labourCategoryId: String(cat.labourCategoryId),
        workerCount: Number(cat.workerCount ?? 0),
        overtimeHours: Number(cat.overtimeHours ?? 0),
      })),
    })),
  };
}

/** `GET /labour-attendance/daily-report` — `attendance.view` */
export async function fetchDailyAttendanceReport(
  query: DailyAttendanceReportQuery,
): Promise<PublicDailyAttendanceReport> {
  const res = await apiGet<PublicDailyAttendanceReport>(
    '/labour-attendance/daily-report',
    {
      projectId: query.projectId,
      attendanceDate: query.attendanceDate,
      siteId: query.siteId,
      shift: query.shift,
      contractorId: query.contractorId,
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Daily attendance report unavailable');
  }
  return normaliseDailyReport(res.data);
}

/** `GET /labour-attendance/daily-deployment` — `attendance.view` (DPR rollup) */
export async function fetchDailyLabourDeployment(
  query: DailyAttendanceReportQuery,
): Promise<PublicDailyAttendanceReport> {
  const res = await apiGet<PublicDailyAttendanceReport>(
    '/labour-attendance/daily-deployment',
    {
      projectId: query.projectId,
      attendanceDate: query.attendanceDate,
      siteId: query.siteId,
      shift: query.shift,
      contractorId: query.contractorId,
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Daily labour deployment unavailable');
  }
  return normaliseDailyReport(res.data);
}

/** `POST /labour-attendance` — `attendance.create` */
export async function createLabourAttendance(
  input: CreateLabourAttendanceInput,
  idempotencyKey?: string,
): Promise<PublicLabourAttendance> {
  const { data } = await apiClient.post<{
    success: boolean;
    message?: string;
    data?: PublicLabourAttendance;
  }>('/labour-attendance', input, {
    headers: idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined,
  });
  if (!data.data) {
    throw new Error(data.message || 'Could not create labour attendance');
  }
  return normaliseAttendance(data.data);
}

/** `POST /labour-attendance/:id/confirm` — `attendance.confirm` */
export async function confirmLabourAttendance(
  id: string,
  confirmationNotes?: string | null,
): Promise<PublicLabourAttendance> {
  const res = await apiPost<PublicLabourAttendance>(
    `/labour-attendance/${id}/confirm`,
    { confirmationNotes: confirmationNotes ?? null },
  );
  if (!res.data) {
    throw new Error(res.message || 'Confirm attendance failed');
  }
  return normaliseAttendance(res.data);
}
