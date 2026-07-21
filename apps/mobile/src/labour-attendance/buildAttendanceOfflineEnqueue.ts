import type { EnqueueTransactionInput } from '@/offline/types';
import type { CreateLabourAttendanceInput } from './types';

/** Offline queue: create+submit labour attendance (`Idempotency-Key`). */
export function buildAttendanceOfflineEnqueue(
  input: CreateLabourAttendanceInput,
): EnqueueTransactionInput {
  if (!input.projectId) throw new Error('projectId is required');
  if (!input.contractorId) throw new Error('contractorId is required');
  if (!input.attendanceDate) throw new Error('attendanceDate is required');
  if (!input.lines?.length) throw new Error('At least one line is required');

  return {
    type: 'labour_attendance_create',
    label: `Attendance ${input.attendanceDate}`,
    projectId: input.projectId,
    endpoint: '/labour-attendance',
    method: 'POST',
    payload: {
      ...input,
      submit: true,
      offlineCapturedAt: input.offlineCapturedAt ?? new Date().toISOString(),
    },
  };
}
