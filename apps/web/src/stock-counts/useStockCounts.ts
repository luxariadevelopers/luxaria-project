import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  approveStockCount,
  cancelStockCount,
  createStockCount,
  fetchStockCount,
  fetchStockCounts,
  postStockCount,
  reviewStockCount,
  submitStockCount,
  updateStockCount,
} from './api';
import { stockCountsKeys } from './queryKeys';
import type {
  ApproveStockCountInput,
  CreateStockCountInput,
  ListStockCountsQuery,
  UpdateStockCountInput,
} from './types';

export function useStockCountsList(
  query: ListStockCountsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: stockCountsKeys.list(query),
    queryFn: () => fetchStockCounts(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useStockCountDetail(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: stockCountsKeys.detail(id ?? ''),
    queryFn: () => fetchStockCount(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

function useInvalidateStockCounts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: stockCountsKeys.all });
  };
}

export function useCreateStockCount() {
  const invalidate = useInvalidateStockCounts();
  return useMutation({
    mutationFn: (input: CreateStockCountInput) => createStockCount(input),
    onSuccess: invalidate,
  });
}

export function useUpdateStockCount() {
  const invalidate = useInvalidateStockCounts();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateStockCountInput }) =>
      updateStockCount(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitStockCount() {
  const invalidate = useInvalidateStockCounts();
  return useMutation({
    mutationFn: (id: string) => submitStockCount(id),
    onSuccess: invalidate,
  });
}

export function useReviewStockCount() {
  const invalidate = useInvalidateStockCounts();
  return useMutation({
    mutationFn: (id: string) => reviewStockCount(id),
    onSuccess: invalidate,
  });
}

export function useApproveStockCount() {
  const invalidate = useInvalidateStockCounts();
  return useMutation({
    mutationFn: (args: { id: string; input?: ApproveStockCountInput }) =>
      approveStockCount(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function usePostStockCount() {
  const invalidate = useInvalidateStockCounts();
  return useMutation({
    mutationFn: (id: string) => postStockCount(id),
    onSuccess: invalidate,
  });
}

export function useCancelStockCount() {
  const invalidate = useInvalidateStockCounts();
  return useMutation({
    mutationFn: (id: string) => cancelStockCount(id),
    onSuccess: invalidate,
  });
}
