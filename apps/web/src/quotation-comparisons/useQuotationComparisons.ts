import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  cancelQuotationComparison,
  fetchComparisonForPurchaseRequest,
  fetchQuotationComparison,
  fetchQuotationComparisons,
  generateQuotationComparison,
  recommendQuotationComparison,
  submitQuotationComparisonForApproval,
} from './api';
import { quotationComparisonsKeys } from './queryKeys';
import type {
  GenerateQuotationComparisonInput,
  ListQuotationComparisonsQuery,
  RecommendQuotationComparisonInput,
} from './types';

export function useQuotationComparisonsList(
  query: ListQuotationComparisonsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: quotationComparisonsKeys.list(query),
    queryFn: () => fetchQuotationComparisons(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useQuotationComparisonDetail(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: quotationComparisonsKeys.detail(id ?? ''),
    queryFn: () => fetchQuotationComparison(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useComparisonForPurchaseRequest(
  prId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: quotationComparisonsKeys.forPr(prId ?? ''),
    queryFn: () => fetchComparisonForPurchaseRequest(prId!),
    enabled: Boolean(prId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useInvalidateComparisons(prId?: string | null) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: quotationComparisonsKeys.all });
    if (prId) {
      void qc.invalidateQueries({
        queryKey: quotationComparisonsKeys.forPr(prId),
      });
    }
  };
}

export function useGenerateQuotationComparison(prId?: string | null) {
  const invalidate = useInvalidateComparisons(prId);
  return useMutation({
    mutationFn: (input: GenerateQuotationComparisonInput) =>
      generateQuotationComparison(input),
    onSuccess: invalidate,
  });
}

export function useRecommendQuotationComparison(prId?: string | null) {
  const invalidate = useInvalidateComparisons(prId);
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: RecommendQuotationComparisonInput;
    }) => recommendQuotationComparison(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useSubmitQuotationComparisonApproval(prId?: string | null) {
  const invalidate = useInvalidateComparisons(prId);
  return useMutation({
    mutationFn: (id: string) => submitQuotationComparisonForApproval(id),
    onSuccess: invalidate,
  });
}

export function useCancelQuotationComparison(prId?: string | null) {
  const invalidate = useInvalidateComparisons(prId);
  return useMutation({
    mutationFn: (id: string) => cancelQuotationComparison(id),
    onSuccess: invalidate,
  });
}
