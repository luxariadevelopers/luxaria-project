/**
 * Mirrors `apps/backend/src/modules/labour-attendance` public shapes.
 */

export const LabourAttendanceStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Confirmed: 'confirmed',
} as const;

export type LabourAttendanceStatus =
  (typeof LabourAttendanceStatus)[keyof typeof LabourAttendanceStatus];

export const LabourAttendanceEntryMode = {
  Group: 'group',
  Individual: 'individual',
} as const;

export type LabourAttendanceEntryMode =
  (typeof LabourAttendanceEntryMode)[keyof typeof LabourAttendanceEntryMode];

export type PublicLabourAttendanceWorker = {
  id: string;
  workerCode: string | null;
  workerName: string;
  checkIn: string | null;
  checkOut: string | null;
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
  contractorId: string;
  attendanceDate: string;
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
  offlineCapturedAt: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  supervisorConfirmed: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
  confirmationNotes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicDailyAttendanceReport = {
  projectId: string;
  attendanceDate: string;
  sheetCount: number;
  totalWorkers: number;
  totalOvertimeHours: number;
  confirmedCount: number;
  pendingConfirmationCount: number;
  sheets: Array<{
    id: string;
    attendanceNumber: string;
    contractorId: string;
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

export type ListLabourAttendanceQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  contractorId?: string;
  attendanceDate?: string;
  fromDate?: string;
  toDate?: string;
  status?: LabourAttendanceStatus;
};

export type ListPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedLabourAttendance = {
  items: PublicLabourAttendance[];
  meta: ListPaginationMeta | null;
};

export type AttendanceDuplicateFlag = {
  kind: 'category' | 'worker_code' | 'worker_name' | 'sheet_key';
  label: string;
  key: string;
};
