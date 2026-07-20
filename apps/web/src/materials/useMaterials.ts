import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMaterial,
  fetchMaterial,
  fetchMaterialLedgerOptions,
  fetchMaterialProjectStock,
  fetchMaterials,
  fetchMaterialUnits,
  fetchMaterialUsageLedger,
  updateMaterial,
} from './api';
import { materialsKeys } from './queryKeys';
import type {
  CreateMaterialInput,
  ListMaterialsQuery,
  ListStockLedgerQuery,
  UpdateMaterialInput,
} from './types';

export function useMaterialsList(query: ListMaterialsQuery, enabled = true) {
  return useQuery({
    queryKey: materialsKeys.list(query),
    queryFn: () => fetchMaterials(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useMaterialDetail(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: materialsKeys.detail(id ?? ''),
    queryFn: () => fetchMaterial(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function useMaterialUnits(enabled = true) {
  return useQuery({
    queryKey: materialsKeys.units(),
    queryFn: () => fetchMaterialUnits(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useMaterialLedgerOptions(enabled = true) {
  return useQuery({
    queryKey: materialsKeys.ledgerOptions(),
    queryFn: () => fetchMaterialLedgerOptions(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

function useInvalidateMaterials() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: materialsKeys.all });
  };
}

export function useCreateMaterial() {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: (input: CreateMaterialInput) => createMaterial(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMaterial() {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateMaterialInput }) =>
      updateMaterial(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useMaterialProjectStock(
  input: {
    materialId: string | null | undefined;
    projectId: string | null | undefined;
    location?: string;
  },
  enabled = true,
) {
  const materialId = input.materialId ?? '';
  const projectId = input.projectId ?? '';
  return useQuery({
    queryKey: materialsKeys.stockBalance(
      materialId,
      projectId,
      input.location,
    ),
    queryFn: () =>
      fetchMaterialProjectStock({
        materialId,
        projectId,
        location: input.location,
      }),
    enabled: Boolean(materialId && projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useMaterialUsageLedger(
  materialId: string | null | undefined,
  query: ListStockLedgerQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: materialsKeys.usage(materialId ?? '', query),
    queryFn: () =>
      fetchMaterialUsageLedger({
        ...query,
        materialId: materialId ?? undefined,
      }),
    enabled: Boolean(materialId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}
