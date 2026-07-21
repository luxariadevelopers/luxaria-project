import type {
  DailyAttendanceReportQuery,
  ListLabourAttendanceQuery,
} from './types';

export const labourAttendanceKeys = {
  all: ['labour-attendance'] as const,
  lists: () => [...labourAttendanceKeys.all, 'list'] as const,
  list: (query: ListLabourAttendanceQuery) =>
    [...labourAttendanceKeys.lists(), query] as const,
  details: () => [...labourAttendanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...labourAttendanceKeys.details(), id] as const,
  dailyReport: (query: DailyAttendanceReportQuery) =>
    [
      ...labourAttendanceKeys.all,
      'daily-report',
      query.projectId,
      query.attendanceDate,
      query.siteId ?? '',
      query.shift ?? '',
      query.contractorId ?? '',
    ] as const,
  dailyDeployment: (query: DailyAttendanceReportQuery) =>
    [
      ...labourAttendanceKeys.all,
      'daily-deployment',
      query.projectId,
      query.attendanceDate,
      query.siteId ?? '',
      query.shift ?? '',
      query.contractorId ?? '',
    ] as const,
};
