import type { ListLabourAttendanceQuery } from './types';

export const labourAttendanceKeys = {
  all: ['labour-attendance'] as const,
  lists: () => [...labourAttendanceKeys.all, 'list'] as const,
  list: (query: ListLabourAttendanceQuery) =>
    [...labourAttendanceKeys.lists(), query] as const,
  details: () => [...labourAttendanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...labourAttendanceKeys.details(), id] as const,
  dailyReport: (projectId: string, attendanceDate: string, contractorId?: string) =>
    [
      ...labourAttendanceKeys.all,
      'daily-report',
      projectId,
      attendanceDate,
      contractorId ?? '',
    ] as const,
};
