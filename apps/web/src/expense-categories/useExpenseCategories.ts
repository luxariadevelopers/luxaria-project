import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  activateExpenseCategory,
  configureEvidenceRules,
  createExpenseCategory,
  deactivateExpenseCategory,
  deleteExpenseCategory,
  fetchExpenseCategory,
  fetchExpenseCategoryTree,
  seedStandardExpenseCategories,
  setExpenseCategoryParent,
  updateExpenseCategory,
} from './api';
import { expenseCategoryKeys } from './queryKeys';
import type {
  ConfigureEvidenceRulesInput,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
} from './types';

export function useExpenseCategoryTree(status?: string, enabled = true) {
  return useQuery({
    queryKey: expenseCategoryKeys.tree(status),
    queryFn: () => fetchExpenseCategoryTree(status),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useExpenseCategory(categoryId: string | null, enabled = true) {
  return useQuery({
    queryKey: expenseCategoryKeys.detail(categoryId ?? ''),
    queryFn: () => fetchExpenseCategory(categoryId!),
    enabled: Boolean(categoryId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: expenseCategoryKeys.all });
  };
}

export function useCreateExpenseCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CreateExpenseCategoryInput) =>
      createExpenseCategory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateExpenseCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateExpenseCategoryInput }) =>
      updateExpenseCategory(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useConfigureEvidenceRules() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (args: { id: string; input: ConfigureEvidenceRulesInput }) =>
      configureEvidenceRules(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSetExpenseCategoryParent() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (args: { id: string; parentCategoryId: string | null }) =>
      setExpenseCategoryParent(args.id, args.parentCategoryId),
    onSuccess: invalidate,
  });
}

export function useActivateExpenseCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => activateExpenseCategory(id),
    onSuccess: invalidate,
  });
}

export function useDeactivateExpenseCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => deactivateExpenseCategory(id),
    onSuccess: invalidate,
  });
}

export function useDeleteExpenseCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(id),
    onSuccess: invalidate,
  });
}

export function useSeedStandardExpenseCategories() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: () => seedStandardExpenseCategories(),
    onSuccess: invalidate,
  });
}
