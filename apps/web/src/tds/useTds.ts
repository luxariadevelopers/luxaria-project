import { useQuery } from '@tanstack/react-query';
import { fetchTdsDeductions, fetchTdsReturns } from './api';
import { tdsKeys } from './queryKeys';
import type { ListTdsDeductionsQuery, ListTdsReturnsQuery } from './types';

export function useTdsDeductionsList(query: ListTdsDeductionsQuery, enabled = true) {
  return useQuery({
    queryKey: tdsKeys.deductions(query),
    queryFn: () => fetchTdsDeductions(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useTdsReturnsList(query: ListTdsReturnsQuery, enabled = true) {
  return useQuery({
    queryKey: tdsKeys.returns(query),
    queryFn: () => fetchTdsReturns(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
