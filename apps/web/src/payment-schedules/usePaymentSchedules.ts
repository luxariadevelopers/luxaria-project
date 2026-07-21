import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approvePaymentSchedule,
  fetchBookingOptionsForSchedule,
  fetchOverdueScheduleLines,
  fetchPaymentSchedule,
  fetchPaymentSchedules,
  generatePaymentDemand,
  generatePaymentSchedule,
  markScheduleLineDue,
  rejectPaymentSchedule,
  revisePaymentSchedule,
  runMarkOverdueJob,
  submitPaymentScheduleForApproval,
} from './api';
import { paymentSchedulesKeys } from './queryKeys';
import type {
  ApprovePaymentScheduleInput,
  GenerateDemandInput,
  GeneratePaymentScheduleInput,
  ListPaymentSchedulesQuery,
  MarkDueInput,
  RejectPaymentScheduleInput,
  RevisePaymentScheduleInput,
} from './types';

export function usePaymentSchedulesList(
  query: ListPaymentSchedulesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: paymentSchedulesKeys.list(query),
    queryFn: () => fetchPaymentSchedules(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function usePaymentScheduleDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: paymentSchedulesKeys.detail(id ?? ''),
    queryFn: () => fetchPaymentSchedule(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useOverdueScheduleLines(
  query: { page?: number; limit?: number },
  enabled = true,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return useQuery({
    queryKey: paymentSchedulesKeys.overdue(page, limit),
    queryFn: () => fetchOverdueScheduleLines({ page, limit }),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useBookingOptionsForSchedule(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: paymentSchedulesKeys.bookings(projectId ?? null),
    queryFn: () => fetchBookingOptionsForSchedule(projectId),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

function useInvalidatePaymentSchedules() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: paymentSchedulesKeys.all });
  };
}

export function useGeneratePaymentSchedule() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: (input: GeneratePaymentScheduleInput) =>
      generatePaymentSchedule(input),
    onSuccess: invalidate,
  });
}

export function useSubmitPaymentScheduleForApproval() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: (id: string) => submitPaymentScheduleForApproval(id),
    onSuccess: invalidate,
  });
}

export function useApprovePaymentSchedule() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: (args: { id: string; input?: ApprovePaymentScheduleInput }) =>
      approvePaymentSchedule(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRejectPaymentSchedule() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: (args: { id: string; input: RejectPaymentScheduleInput }) =>
      rejectPaymentSchedule(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRevisePaymentSchedule() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: (args: { id: string; input: RevisePaymentScheduleInput }) =>
      revisePaymentSchedule(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useMarkScheduleLineDue() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: (args: { id: string; input: MarkDueInput }) =>
      markScheduleLineDue(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useGeneratePaymentDemand() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: (args: { id: string; input: GenerateDemandInput }) =>
      generatePaymentDemand(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRunMarkOverdueJob() {
  const invalidate = useInvalidatePaymentSchedules();
  return useMutation({
    mutationFn: () => runMarkOverdueJob(),
    onSuccess: invalidate,
  });
}
