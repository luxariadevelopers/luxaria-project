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

export const LabourAttendanceShift = {
  Morning: 'morning',
  Afternoon: 'afternoon',
  Night: 'night',
  General: 'general',
} as const;

export type LabourAttendanceShift =
  (typeof LabourAttendanceShift)[keyof typeof LabourAttendanceShift];

export type PublicLabourAttendanceWorker = {
  id: string;
  workerCode: string | null;
  workerName: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
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
  attendanceDate: string;
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

export type ListLabourAttendanceQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  siteId?: string;
  contractorId?: string;
  dprId?: string;
  attendanceDate?: string;
  fromDate?: string;
  toDate?: string;
  shift?: LabourAttendanceShift;
  status?: LabourAttendanceStatus;
};

export type DailyAttendanceReportQuery = {
  projectId: string;
  attendanceDate: string;
  siteId?: string;
  shift?: LabourAttendanceShift;
  contractorId?: string;
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
