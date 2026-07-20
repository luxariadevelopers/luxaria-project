import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveMaterialCoefficient,
  createMaterialCoefficient,
  createMaterialCoefficientVersion,
  fetchMaterialCoefficient,
  fetchMaterialCoefficients,
  rejectMaterialCoefficient,
  submitMaterialCoefficient,
  updateMaterialCoefficient,
} from './api';
import { materialCoefficientKeys } from './queryKeys';
import type {
  ApproveMaterialCoefficientInput,
  CreateMaterialCoefficientInput,
  ListMaterialCoefficientsQuery,
  RejectMaterialCoefficientInput,
  UpdateMaterialCoefficientInput,
} from './types';

export function useMaterialCoefficientsList(
  query: ListMaterialCoefficientsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: materialCoefficientKeys.list(query),
    queryFn: () => fetchMaterialCoefficients(query),
    enabled,
  });
}

export function useMaterialCoefficientDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: materialCoefficientKeys.detail(id),
    queryFn: () => fetchMaterialCoefficient(id),
    enabled: enabled && Boolean(id),
  });
}

function useInvalidateCoefficients() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: materialCoefficientKeys.all });
}

export function useCreateMaterialCoefficient() {
  const invalidate = useInvalidateCoefficients();
  return useMutation({
    mutationFn: (input: CreateMaterialCoefficientInput) =>
      createMaterialCoefficient(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateMaterialCoefficient() {
  const invalidate = useInvalidateCoefficients();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateMaterialCoefficientInput;
    }) => updateMaterialCoefficient(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateMaterialCoefficientVersion() {
  const invalidate = useInvalidateCoefficients();
  return useMutation({
    mutationFn: (id: string) => createMaterialCoefficientVersion(id),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitMaterialCoefficient() {
  const invalidate = useInvalidateCoefficients();
  return useMutation({
    mutationFn: (id: string) => submitMaterialCoefficient(id),
    onSuccess: () => invalidate(),
  });
}

export function useApproveMaterialCoefficient() {
  const invalidate = useInvalidateCoefficients();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ApproveMaterialCoefficientInput;
    }) => approveMaterialCoefficient(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useRejectMaterialCoefficient() {
  const invalidate = useInvalidateCoefficients();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RejectMaterialCoefficientInput;
    }) => rejectMaterialCoefficient(id, input),
    onSuccess: () => invalidate(),
  });
}
