import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateLabourCategory,
  createLabourCategory,
  createLabourCategoryRate,
  deactivateLabourCategory,
  fetchLabourCategories,
  fetchLabourCategory,
  fetchLabourCategoryRates,
  resolveLabourCategoryRate,
  seedStandardLabourCategories,
  updateLabourCategory,
  updateLabourCategoryRate,
} from './api';
import { labourCategoryKeys } from './queryKeys';
import type {
  CreateLabourCategoryInput,
  CreateLabourCategoryRateInput,
  ListLabourCategoriesQuery,
  ListLabourCategoryRatesQuery,
  ResolveLabourCategoryRateQuery,
  UpdateLabourCategoryInput,
  UpdateLabourCategoryRateInput,
} from './types';

export function useLabourCategoriesList(
  query: ListLabourCategoriesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: labourCategoryKeys.list(query),
    queryFn: () => fetchLabourCategories(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useLabourCategory(categoryId: string | null, enabled = true) {
  return useQuery({
    queryKey: labourCategoryKeys.detail(categoryId ?? ''),
    queryFn: () => fetchLabourCategory(categoryId!),
    enabled: Boolean(categoryId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useLabourCategoryRates(
  categoryId: string | null,
  query: ListLabourCategoryRatesQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: labourCategoryKeys.rates(categoryId ?? '', query),
    queryFn: () => fetchLabourCategoryRates(categoryId!, query),
    enabled: Boolean(categoryId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useResolveLabourCategoryRate(
  query: ResolveLabourCategoryRateQuery | null,
  enabled = true,
) {
  return useQuery({
    queryKey: labourCategoryKeys.resolve(
      query ?? { labourCategoryId: '' },
    ),
    queryFn: () => resolveLabourCategoryRate(query!),
    enabled: Boolean(query?.labourCategoryId) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateLabourCategories() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: labourCategoryKeys.all });
  };
}

export function useCreateLabourCategory() {
  const invalidate = useInvalidateLabourCategories();
  return useMutation({
    mutationFn: (input: CreateLabourCategoryInput) =>
      createLabourCategory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateLabourCategory() {
  const invalidate = useInvalidateLabourCategories();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateLabourCategoryInput }) =>
      updateLabourCategory(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useActivateLabourCategory() {
  const invalidate = useInvalidateLabourCategories();
  return useMutation({
    mutationFn: (id: string) => activateLabourCategory(id),
    onSuccess: invalidate,
  });
}

export function useDeactivateLabourCategory() {
  const invalidate = useInvalidateLabourCategories();
  return useMutation({
    mutationFn: (id: string) => deactivateLabourCategory(id),
    onSuccess: invalidate,
  });
}

export function useSeedStandardLabourCategories() {
  const invalidate = useInvalidateLabourCategories();
  return useMutation({
    mutationFn: () => seedStandardLabourCategories(),
    onSuccess: invalidate,
  });
}

export function useCreateLabourCategoryRate() {
  const invalidate = useInvalidateLabourCategories();
  return useMutation({
    mutationFn: (args: {
      categoryId: string;
      input: CreateLabourCategoryRateInput;
    }) => createLabourCategoryRate(args.categoryId, args.input),
    onSuccess: invalidate,
  });
}

export function useUpdateLabourCategoryRate() {
  const invalidate = useInvalidateLabourCategories();
  return useMutation({
    mutationFn: (args: {
      rateId: string;
      input: UpdateLabourCategoryRateInput;
    }) => updateLabourCategoryRate(args.rateId, args.input),
    onSuccess: invalidate,
  });
}
