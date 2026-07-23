import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  confirmLabourAttendance,
  createLabourAttendance,
  fetchDailyAttendanceReport,
  fetchDailyLabourDeployment,
  fetchLabourAttendance,
  fetchLabourAttendanceList,
} from './api';
import { labourAttendanceKeys } from './queryKeys';
import type {
  CreateLabourAttendanceInput,
  DailyAttendanceReportQuery,
  ListLabourAttendanceQuery,
} from './types';

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
  query: DailyAttendanceReportQuery | null,
  enabled = true,
) {
  return useQuery({
    queryKey: labourAttendanceKeys.dailyReport(
      query ?? {
        projectId: '',
        attendanceDate: '',
      },
    ),
    queryFn: () => fetchDailyAttendanceReport(query!),
    enabled:
      Boolean(query?.projectId && query.attendanceDate) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useDailyLabourDeployment(
  query: DailyAttendanceReportQuery | null,
  enabled = true,
) {
  return useQuery({
    queryKey: labourAttendanceKeys.dailyDeployment(
      query ?? {
        projectId: '',
        attendanceDate: '',
      },
    ),
    queryFn: () => fetchDailyLabourDeployment(query!),
    enabled:
      Boolean(query?.projectId && query.attendanceDate) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateLabourAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      input: CreateLabourAttendanceInput;
      idempotencyKey?: string;
    }) => createLabourAttendance(args.input, args.idempotencyKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labourAttendanceKeys.all });
    },
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
