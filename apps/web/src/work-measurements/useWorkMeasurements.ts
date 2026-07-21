import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelWorkMeasurement,
  certifyWorkMeasurement,
  createWorkMeasurement,
  fetchBoqItemsForMeasurement,
  fetchContractorsForMeasurement,
  fetchWorkMeasurement,
  fetchWorkMeasurements,
  rejectWorkMeasurement,
  submitWorkMeasurement,
  updateWorkMeasurement,
  verifyWorkMeasurement,
} from './api';
import { workMeasurementsKeys } from './queryKeys';
import { computePreviousQuantity } from './validation';
import type {
  CertifyWorkMeasurementInput,
  CreateWorkMeasurementInput,
  ListWorkMeasurementsQuery,
  RejectWorkMeasurementInput,
  UpdateWorkMeasurementInput,
  VerifyWorkMeasurementInput,
} from './types';

export function useWorkMeasurementsList(
  query: ListWorkMeasurementsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: workMeasurementsKeys.list(query),
    queryFn: () => fetchWorkMeasurements(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useWorkMeasurementDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: workMeasurementsKeys.detail(id ?? ''),
    queryFn: () => fetchWorkMeasurement(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useBoqItemsForMeasurement(
  projectId: string | null | undefined,
  search: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workMeasurementsKeys.boqItems(projectId ?? '', search),
    queryFn: () =>
      fetchBoqItemsForMeasurement({
        projectId: projectId!,
        search: search || undefined,
      }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useContractorsForMeasurement(
  search: string,
  enabled = true,
) {
  return useQuery({
    queryKey: workMeasurementsKeys.contractors(search),
    queryFn: () =>
      fetchContractorsForMeasurement({ search: search || undefined }),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function usePriorQuantityPreview(query: {
  projectId: string | null | undefined;
  contractorId: string | null | undefined;
  boqItemId: string | null | undefined;
  excludeId?: string;
  enabled?: boolean;
}) {
  const listQuery: ListWorkMeasurementsQuery = {
    projectId: query.projectId ?? undefined,
    contractorId: query.contractorId ?? undefined,
    boqItemId: query.boqItemId ?? undefined,
    page: 1,
    limit: 100,
  };

  const list = useWorkMeasurementsList(
    listQuery,
    Boolean(query.projectId && query.contractorId && query.boqItemId) &&
      (query.enabled ?? true),
  );

  const previousQuantity = computePreviousQuantity(
    list.data?.items ?? [],
    query.excludeId,
  );

  return {
    ...list,
    previousQuantity,
  };
}

function useInvalidateWorkMeasurements() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: workMeasurementsKeys.all });
  };
}

export function useCreateWorkMeasurement() {
  const invalidate = useInvalidateWorkMeasurements();
  return useMutation({
    mutationFn: (input: CreateWorkMeasurementInput) =>
      createWorkMeasurement(input),
    onSuccess: invalidate,
  });
}

export function useUpdateWorkMeasurement() {
  const invalidate = useInvalidateWorkMeasurements();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateWorkMeasurementInput }) =>
      updateWorkMeasurement(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitWorkMeasurement() {
  const invalidate = useInvalidateWorkMeasurements();
  return useMutation({
    mutationFn: (id: string) => submitWorkMeasurement(id),
    onSuccess: invalidate,
  });
}

export function useVerifyWorkMeasurement() {
  const invalidate = useInvalidateWorkMeasurements();
  return useMutation({
    mutationFn: (args: { id: string; input?: VerifyWorkMeasurementInput }) =>
      verifyWorkMeasurement(args.id, args.input ?? {}),
    onSuccess: invalidate,
  });
}

export function useCertifyWorkMeasurement() {
  const invalidate = useInvalidateWorkMeasurements();
  return useMutation({
    mutationFn: (args: { id: string; input?: CertifyWorkMeasurementInput }) =>
      certifyWorkMeasurement(args.id, args.input ?? {}),
    onSuccess: invalidate,
  });
}

export function useRejectWorkMeasurement() {
  const invalidate = useInvalidateWorkMeasurements();
  return useMutation({
    mutationFn: (args: { id: string; input: RejectWorkMeasurementInput }) =>
      rejectWorkMeasurement(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelWorkMeasurement() {
  const invalidate = useInvalidateWorkMeasurements();
  return useMutation({
    mutationFn: (id: string) => cancelWorkMeasurement(id),
    onSuccess: invalidate,
  });
}
