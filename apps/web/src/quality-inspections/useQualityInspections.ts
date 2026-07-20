import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelQualityInspection,
  completeQualityInspection,
  createQualityInspection,
  fetchInspectableGrns,
  fetchQualityInspection,
  fetchQualityInspections,
  fetchVendorQualityScore,
  updateQualityInspection,
} from './api';
import { qualityInspectionsKeys } from './queryKeys';
import type {
  CompleteQualityInspectionInput,
  CreateQualityInspectionInput,
  ListQualityInspectionsQuery,
  UpdateQualityInspectionInput,
} from './types';

export function useQualityInspectionsList(
  query: ListQualityInspectionsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: qualityInspectionsKeys.list(query),
    queryFn: () => fetchQualityInspections(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useQualityInspectionDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: qualityInspectionsKeys.detail(id ?? ''),
    queryFn: () => fetchQualityInspection(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useVendorQualityScore(
  vendorId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: qualityInspectionsKeys.vendorScore(vendorId ?? ''),
    queryFn: () => fetchVendorQualityScore(vendorId!),
    enabled: Boolean(vendorId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useInspectableGrns(
  projectId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: qualityInspectionsKeys.inspectableGrns(projectId ?? ''),
    queryFn: () => fetchInspectableGrns({ projectId: projectId! }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateQualityInspections() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qualityInspectionsKeys.all });
  };
}

export function useCreateQualityInspection() {
  const invalidate = useInvalidateQualityInspections();
  return useMutation({
    mutationFn: (input: CreateQualityInspectionInput) =>
      createQualityInspection(input),
    onSuccess: invalidate,
  });
}

export function useUpdateQualityInspection() {
  const invalidate = useInvalidateQualityInspections();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateQualityInspectionInput }) =>
      updateQualityInspection(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCompleteQualityInspection() {
  const invalidate = useInvalidateQualityInspections();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: CompleteQualityInspectionInput;
    }) => completeQualityInspection(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useCancelQualityInspection() {
  const invalidate = useInvalidateQualityInspections();
  return useMutation({
    mutationFn: (id: string) => cancelQualityInspection(id),
    onSuccess: invalidate,
  });
}
