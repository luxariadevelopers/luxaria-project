export const ATTENDANCE_PERMISSIONS = {
  view: 'attendance.view',
  create: 'attendance.create',
  confirm: 'attendance.confirm',
} as const;

export function resolveAttendanceCapabilities(
  hasPermission: (code: string) => boolean,
) {
  return {
    canView: hasPermission(ATTENDANCE_PERMISSIONS.view),
    canCreate: hasPermission(ATTENDANCE_PERMISSIONS.create),
    canConfirm: hasPermission(ATTENDANCE_PERMISSIONS.confirm),
  };
}
