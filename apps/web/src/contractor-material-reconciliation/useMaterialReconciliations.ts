import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approveMaterialReconciliation,
  createMaterialReconciliation,
  listMaterialReconciliations,
  postMaterialReconciliationToBill,
  type CreateMaterialReconciliationInput,
  type ListMaterialReconciliationsQuery,
} from './api';

export const materialReconciliationKeys = {
  all: ['material-reconciliations'] as const,
  list: (query: ListMaterialReconciliationsQuery) =>
    [...materialReconciliationKeys.all, 'list', query] as const,
};

export function useMaterialReconciliationsList(
  query: ListMaterialReconciliationsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: materialReconciliationKeys.list(query),
    queryFn: () => listMaterialReconciliations(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    void qc.invalidateQueries({
      queryKey: materialReconciliationKeys.all,
    });
}

export function useCreateMaterialReconciliation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateMaterialReconciliationInput) =>
      createMaterialReconciliation(input),
    onSuccess: invalidate,
  });
}

export function useApproveMaterialReconciliation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => approveMaterialReconciliation(id),
    onSuccess: invalidate,
  });
}

export function usePostMaterialReconciliationToBill() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, billId }: { id: string; billId: string }) =>
      postMaterialReconciliationToBill(id, billId),
    onSuccess: invalidate,
  });
}
