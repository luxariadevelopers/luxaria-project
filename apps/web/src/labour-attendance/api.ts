import { apiGet, apiPost } from '@/api/client';
import type {
  ListLabourAttendanceQuery,
  ListPaginationMeta,
  PaginatedLabourAttendance,
  PublicDailyAttendanceReport,
  PublicLabourAttendance,
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

function normaliseAttendance(
  row: PublicLabourAttendance,
): PublicLabourAttendance {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    attendanceDate: toIso(row.attendanceDate) ?? String(row.attendanceDate),
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
      workers: (line.workers ?? []).map((worker) => ({
        ...worker,
        id: String(worker.id ?? ''),
        workerCode: worker.workerCode ?? null,
        checkIn: toIso(worker.checkIn),
        checkOut: toIso(worker.checkOut),
        overtimeHours: Number(worker.overtimeHours ?? 0),
        remarks: worker.remarks ?? null,
      })),
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
    contractorId: query.contractorId,
    attendanceDate: query.attendanceDate,
    fromDate: query.fromDate,
    toDate: query.toDate,
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

/** `GET /labour-attendance/daily-report` — `attendance.view` */
export async function fetchDailyAttendanceReport(query: {
  projectId: string;
  attendanceDate: string;
  contractorId?: string;
}): Promise<PublicDailyAttendanceReport> {
  const res = await apiGet<PublicDailyAttendanceReport>(
    '/labour-attendance/daily-report',
    {
      projectId: query.projectId,
      attendanceDate: query.attendanceDate,
      contractorId: query.contractorId,
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Daily attendance report unavailable');
  }
  return {
    ...res.data,
    projectId: String(res.data.projectId),
    attendanceDate: String(res.data.attendanceDate).slice(0, 10),
    sheetCount: Number(res.data.sheetCount ?? 0),
    totalWorkers: Number(res.data.totalWorkers ?? 0),
    totalOvertimeHours: Number(res.data.totalOvertimeHours ?? 0),
    confirmedCount: Number(res.data.confirmedCount ?? 0),
    pendingConfirmationCount: Number(
      res.data.pendingConfirmationCount ?? 0,
    ),
    sheets: (res.data.sheets ?? []).map((sheet) => ({
      ...sheet,
      id: String(sheet.id),
      contractorId: String(sheet.contractorId),
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
