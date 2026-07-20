import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  acceptGoodsReceipt,
  fetchGoodsReceipt,
  fetchGoodsReceipts,
  fetchPurchaseOrderForCompare,
  postGoodsReceipt,
  startGrnQualityCheck,
} from './api';
import { grnsKeys } from './queryKeys';
import type { ListGoodsReceiptsQuery, QualityAcceptInput } from './types';

export function useGrnsList(
  query: ListGoodsReceiptsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: grnsKeys.list(query),
    queryFn: () => fetchGoodsReceipts(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useGrnDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: grnsKeys.detail(id ?? ''),
    queryFn: () => fetchGoodsReceipt(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
    retry: false,
  });
}

export function usePurchaseOrderForCompare(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: grnsKeys.purchaseOrder(id ?? ''),
    queryFn: () => fetchPurchaseOrderForCompare(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

function useInvalidateGrns() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: grnsKeys.all });
    if (id) {
      void qc.invalidateQueries({ queryKey: grnsKeys.detail(id) });
    }
  };
}

export function useStartGrnQualityCheck() {
  const invalidate = useInvalidateGrns();
  return useMutation({
    mutationFn: (id: string) => startGrnQualityCheck(id),
    onSuccess: (row) => invalidate(row.id),
  });
}

export function useAcceptGoodsReceipt() {
  const invalidate = useInvalidateGrns();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: QualityAcceptInput;
    }) => acceptGoodsReceipt(id, input),
    onSuccess: (row) => invalidate(row.id),
  });
}

export function usePostGoodsReceipt() {
  const invalidate = useInvalidateGrns();
  return useMutation({
    mutationFn: (id: string) => postGoodsReceipt(id),
    onSuccess: (row) => invalidate(row.id),
  });
}
