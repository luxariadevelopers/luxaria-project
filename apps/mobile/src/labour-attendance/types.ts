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

export type PublicLabourAttendance = {
  id: string;
  attendanceNumber: string;
  projectId: string;
  contractorId: string;
  attendanceDate: string;
  workLocation: string | null;
  status: LabourAttendanceStatus;
  totalWorkers: number;
  totalOvertimeHours: number;
  supervisorConfirmed: boolean;
  remarks: string | null;
};

export type CreateLabourAttendanceInput = {
  projectId: string;
  contractorId: string;
  attendanceDate: string;
  workLocation?: string | null;
  lines: Array<{
    labourCategoryId: string;
    entryMode: LabourAttendanceEntryMode;
    workerCount?: number;
    overtimeHours?: number;
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
