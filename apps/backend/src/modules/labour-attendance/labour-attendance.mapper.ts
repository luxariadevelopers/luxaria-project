import type { Types } from 'mongoose';
import type {
  LabourAttendanceEntryMode,
  LabourAttendanceShift,
  LabourAttendanceStatus,
} from './schemas/labour-attendance.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicLabourAttendanceWorker = {
  id: string;
  workerCode: string | null;
  workerName: string;
  /** Canonical check-in timestamp */
  checkIn: Date | null;
  /** Canonical check-out timestamp */
  checkOut: Date | null;
  /** SE alias of checkIn */
  checkInAt: Date | null;
  /** SE alias of checkOut */
  checkOutAt: Date | null;
  overtimeHours: number;
  remarks: string | null;
};

export type PublicLabourAttendanceLine = {
  id: string;
  labourCategoryId: string;
  labourCategoryCode: string | null;
  labourCategoryName: string | null;
  entryMode: LabourAttendanceEntryMode;
  workerCount: number;
  overtimeHours: number;
  workers: PublicLabourAttendanceWorker[];
  remarks: string | null;
};

export type PublicLabourAttendance = {
  id: string;
  attendanceNumber: string;
  projectId: string;
  siteId: string | null;
  contractorId: string;
  dprId: string | null;
  attendanceDate: Date;
  shift: LabourAttendanceShift;
  workLocation: string | null;
  latitude: number | null;
  longitude: number | null;
  lines: PublicLabourAttendanceLine[];
  groupPhotoDocumentIds: string[];
  remarks: string | null;
  status: LabourAttendanceStatus;
  totalWorkers: number;
  totalOvertimeHours: number;
  clientDeviceId: string | null;
  offlineCapturedAt: Date | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  supervisorConfirmed: boolean;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  confirmationNotes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicDailyAttendanceReport = {
  projectId: string;
  siteId: string | null;
  attendanceDate: string;
  shift: LabourAttendanceShift | null;
  sheetCount: number;
  totalWorkers: number;
  totalOvertimeHours: number;
  confirmedCount: number;
  pendingConfirmationCount: number;
  sheets: Array<{
    id: string;
    attendanceNumber: string;
    siteId: string | null;
    contractorId: string;
    dprId: string | null;
    shift: LabourAttendanceShift;
    status: LabourAttendanceStatus;
    supervisorConfirmed: boolean;
    workLocation: string | null;
    latitude: number | null;
    longitude: number | null;
    totalWorkers: number;
    totalOvertimeHours: number;
    byCategory: Array<{
      labourCategoryId: string;
      labourCategoryCode: string | null;
      labourCategoryName: string | null;
      entryMode: LabourAttendanceEntryMode;
      workerCount: number;
      overtimeHours: number;
    }>;
  }>;
};

export type AttendanceLike = {
  _id: Types.ObjectId | string;
  attendanceNumber: string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  contractorId: Types.ObjectId | string;
  dprId?: Types.ObjectId | string | null;
  attendanceDate: Date;
  shift?: LabourAttendanceShift;
  workLocation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lines?: Array<{
    _id?: Types.ObjectId | string;
    labourCategoryId: Types.ObjectId | string;
    labourCategoryCode?: string | null;
    labourCategoryName?: string | null;
    entryMode: LabourAttendanceEntryMode;
    workerCount: number;
    overtimeHours: number;
    workers?: Array<{
      _id?: Types.ObjectId | string;
      workerCode?: string | null;
      workerName: string;
      checkIn?: Date | null;
      checkOut?: Date | null;
      overtimeHours: number;
      remarks?: string | null;
    }>;
    remarks?: string | null;
  }>;
  groupPhotoDocumentIds?: Array<Types.ObjectId | string>;
  remarks?: string | null;
  status: LabourAttendanceStatus;
  clientDeviceId?: string | null;
  offlineCapturedAt?: Date | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  supervisorConfirmed?: boolean;
  confirmedBy?: Types.ObjectId | string | null;
  confirmedAt?: Date | null;
  confirmationNotes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function mapWorker(worker: {
  _id?: Types.ObjectId | string;
  workerCode?: string | null;
  workerName: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  overtimeHours: number;
  remarks?: string | null;
}): PublicLabourAttendanceWorker {
  const checkIn = worker.checkIn ?? null;
  const checkOut = worker.checkOut ?? null;
  return {
    id: worker._id ? String(worker._id) : '',
    workerCode: worker.workerCode ?? null,
    workerName: worker.workerName,
    checkIn,
    checkOut,
    checkInAt: checkIn,
    checkOutAt: checkOut,
    overtimeHours: worker.overtimeHours ?? 0,
    remarks: worker.remarks ?? null,
  };
}

function mapLine(line: NonNullable<AttendanceLike['lines']>[number]): PublicLabourAttendanceLine {
  return {
    id: line._id ? String(line._id) : '',
    labourCategoryId: String(line.labourCategoryId),
    labourCategoryCode: line.labourCategoryCode ?? null,
    labourCategoryName: line.labourCategoryName ?? null,
    entryMode: line.entryMode,
    workerCount: line.workerCount,
    overtimeHours: line.overtimeHours,
    workers: (line.workers ?? []).map(mapWorker),
    remarks: line.remarks ?? null,
  };
}

export function totalsFromLines(
  lines: Array<{ workerCount: number; overtimeHours: number }>,
): { totalWorkers: number; totalOvertimeHours: number } {
  return {
    totalWorkers: lines.reduce((sum, line) => sum + (line.workerCount || 0), 0),
    totalOvertimeHours:
      Math.round(
        lines.reduce((sum, line) => sum + (line.overtimeHours || 0), 0) * 100,
      ) / 100,
  };
}

export function toPublicLabourAttendance(
  row: AttendanceLike,
): PublicLabourAttendance {
  const lines = (row.lines ?? []).map(mapLine);
  const totals = totalsFromLines(lines);

  return {
    id: String(row._id),
    attendanceNumber: row.attendanceNumber,
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    contractorId: String(row.contractorId),
    dprId: oid(row.dprId),
    attendanceDate: row.attendanceDate,
    shift: row.shift ?? ('general' as LabourAttendanceShift),
    workLocation: row.workLocation ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    lines,
    groupPhotoDocumentIds: (row.groupPhotoDocumentIds ?? []).map(String),
    remarks: row.remarks ?? null,
    status: row.status,
    totalWorkers: totals.totalWorkers,
    totalOvertimeHours: totals.totalOvertimeHours,
    clientDeviceId: row.clientDeviceId ?? null,
    offlineCapturedAt: row.offlineCapturedAt ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    supervisorConfirmed: Boolean(row.supervisorConfirmed),
    confirmedBy: oid(row.confirmedBy),
    confirmedAt: row.confirmedAt ?? null,
    confirmationNotes: row.confirmationNotes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
