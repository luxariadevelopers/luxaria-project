import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelContractorBill,
  createContractorBill,
  directorApproveContractorBill,
  engineerVerifyContractorBill,
  fetchActiveAgreements,
  fetchBilledMeasurementIds,
  fetchContractorBill,
  fetchContractorBills,
  fetchContractorOptions,
  fetchEligibleMeasurements,
  financeVerifyContractorBill,
  pmCertifyContractorBill,
  rejectContractorBill,
  submitContractorBillClaim,
  updateContractorBill,
} from './api';
import { runningBillsKeys } from './queryKeys';
import type {
  CreateContractorBillInput,
  ListContractorBillsQuery,
  RejectContractorBillInput,
  UpdateContractorBillInput,
  WorkflowNoteInput,
} from './types';

export function useRunningBillsList(
  query: ListContractorBillsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: runningBillsKeys.list(query),
    queryFn: () => fetchContractorBills(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useRunningBillDetail(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: runningBillsKeys.detail(id ?? ''),
    queryFn: () => fetchContractorBill(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useEligibleMeasurements(
  query: {
    projectId: string;
    contractorId: string;
    fromDate: string;
    toDate: string;
  } | null,
  enabled = true,
) {
  return useQuery({
    queryKey: runningBillsKeys.eligibleMeasurements(
      query?.projectId ?? '',
      query?.contractorId ?? '',
      query?.fromDate ?? '',
      query?.toDate ?? '',
    ),
    queryFn: () => fetchEligibleMeasurements(query!),
    enabled:
      enabled &&
      Boolean(
        query?.projectId &&
          query.contractorId &&
          query.fromDate &&
          query.toDate,
      ),
    staleTime: 15_000,
    retry: false,
  });
}

export function useActiveAgreements(
  projectId: string | null | undefined,
  contractorId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: runningBillsKeys.agreements(
      projectId ?? '',
      contractorId ?? '',
    ),
    queryFn: () =>
      fetchActiveAgreements({
        projectId: projectId!,
        contractorId: contractorId!,
      }),
    enabled: Boolean(projectId && contractorId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useContractorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: runningBillsKeys.contractors(search),
    queryFn: () => fetchContractorOptions(search),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useBilledMeasurementIds(
  projectId: string | null | undefined,
  contractorId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...runningBillsKeys.all,
      'billed-measurement-ids',
      projectId ?? '',
      contractorId ?? '',
    ] as const,
    queryFn: () =>
      fetchBilledMeasurementIds({
        projectId: projectId!,
        contractorId: contractorId || undefined,
      }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateRunningBills() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: runningBillsKeys.all });
  };
}

export function useCreateRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (input: CreateContractorBillInput) =>
      createContractorBill(input),
    onSuccess: invalidate,
  });
}

export function useUpdateRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateContractorBillInput }) =>
      updateContractorBill(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitRunningBillClaim() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (id: string) => submitContractorBillClaim(id),
    onSuccess: invalidate,
  });
}

export function useEngineerVerifyRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (args: { id: string; input?: WorkflowNoteInput }) =>
      engineerVerifyContractorBill(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function usePmCertifyRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (args: { id: string; input?: WorkflowNoteInput }) =>
      pmCertifyContractorBill(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useFinanceVerifyRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (args: { id: string; input?: WorkflowNoteInput }) =>
      financeVerifyContractorBill(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useDirectorApproveRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (args: { id: string; input?: WorkflowNoteInput }) =>
      directorApproveContractorBill(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useRejectRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (args: { id: string; input: RejectContractorBillInput }) =>
      rejectContractorBill(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelRunningBill() {
  const invalidate = useInvalidateRunningBills();
  return useMutation({
    mutationFn: (id: string) => cancelContractorBill(id),
    onSuccess: invalidate,
  });
}
