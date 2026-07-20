import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  confirmLabourAttendance,
  fetchDailyAttendanceReport,
  fetchLabourAttendance,
  fetchLabourAttendanceList,
} from './api';
import { labourAttendanceKeys } from './queryKeys';
import type { ListLabourAttendanceQuery } from './types';

export function useLabourAttendanceList(
  query: ListLabourAttendanceQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: labourAttendanceKeys.list(query),
    queryFn: () => fetchLabourAttendanceList(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useLabourAttendanceDetail(
  id: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: labourAttendanceKeys.detail(id ?? ''),
    queryFn: () => fetchLabourAttendance(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useDailyAttendanceReport(
  query: {
    projectId: string;
    attendanceDate: string;
    contractorId?: string;
  } | null,
  enabled = true,
) {
  return useQuery({
    queryKey: labourAttendanceKeys.dailyReport(
      query?.projectId ?? '',
      query?.attendanceDate ?? '',
      query?.contractorId,
    ),
    queryFn: () => fetchDailyAttendanceReport(query!),
    enabled:
      Boolean(query?.projectId && query.attendanceDate) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useConfirmLabourAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; confirmationNotes?: string | null }) =>
      confirmLabourAttendance(args.id, args.confirmationNotes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labourAttendanceKeys.all });
    },
  });
}
