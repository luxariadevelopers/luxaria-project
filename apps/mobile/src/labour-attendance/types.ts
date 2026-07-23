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

export type PublicLabourAttendance = {
  id: string;
  attendanceNumber: string;
  projectId: string;
  siteId?: string | null;
  contractorId: string;
  dprId?: string | null;
  attendanceDate: string;
  shift?: LabourAttendanceShift;
  workLocation: string | null;
  status: LabourAttendanceStatus;
  totalWorkers: number;
  totalOvertimeHours: number;
  supervisorConfirmed: boolean;
  remarks: string | null;
};

export type CreateLabourAttendanceWorkerInput = {
  workerName: string;
  workerCode?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  overtimeHours?: number;
  remarks?: string | null;
};

export type CreateLabourAttendanceInput = {
  projectId: string;
  siteId?: string | null;
  contractorId: string;
  dprId?: string | null;
  attendanceDate: string;
  shift?: LabourAttendanceShift;
  workLocation?: string | null;
  lines: Array<{
    labourCategoryId: string;
    entryMode: LabourAttendanceEntryMode;
    workerCount?: number;
    overtimeHours?: number;
    workers?: CreateLabourAttendanceWorkerInput[];
    remarks?: string | null;
  }>;
  remarks?: string | null;
  submit?: boolean;
  clientDeviceId?: string | null;
  offlineCapturedAt?: string | null;
};

export type LabourCategoryOption = {
  id: string;
  categoryCode: string;
  categoryName: string;
};

export type ContractorOption = {
  id: string;
  contractorCode: string;
  legalName: string;
};
