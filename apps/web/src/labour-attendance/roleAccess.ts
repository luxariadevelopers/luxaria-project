/**
 * Nest RBAC for Labour Attendance (exact catalog):
 * - `attendance.view` — list/get/daily-report
 * - `attendance.create` — create/update/submit
 * - `attendance.confirm` — supervisor confirmation
 *
 * Phase prompt aliases `labour_attendance.view` / `labour_attendance.review`
 * are not in the Nest catalog — map view→`attendance.view`,
 * review→`attendance.confirm`.
 */
export type LabourAttendanceCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canConfirm: boolean;
  /** Alias for review workflows (Nest `attendance.confirm`). */
  canReview: boolean;
};

export function resolveLabourAttendanceCapabilities(
  hasPermission: (code: string) => boolean,
): LabourAttendanceCapabilities {
  const canConfirm = hasPermission('attendance.confirm');
  return {
    canView: hasPermission('attendance.view'),
    canCreate: hasPermission('attendance.create'),
    canConfirm,
    canReview: canConfirm,
  };
}
