import {
  LabourAttendanceEntryMode,
  LabourAttendanceStatus,
  type LabourAttendanceEntryMode as EntryMode,
  type LabourAttendanceStatus as Status,
} from './types';

export function attendanceStatusLabel(status: Status | string): string {
  switch (status) {
    case LabourAttendanceStatus.Draft:
      return 'Draft';
    case LabourAttendanceStatus.Submitted:
      return 'Submitted';
    case LabourAttendanceStatus.Confirmed:
      return 'Confirmed';
    default:
      return status;
  }
}

export function attendanceEntryModeLabel(mode: EntryMode | string): string {
  switch (mode) {
    case LabourAttendanceEntryMode.Group:
      return 'Group';
    case LabourAttendanceEntryMode.Individual:
      return 'Individual';
    default:
      return mode;
  }
}
