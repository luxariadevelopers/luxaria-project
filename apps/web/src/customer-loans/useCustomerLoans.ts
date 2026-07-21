import { useQuery } from '@tanstack/react-query';
import { fetchCustomerLoans } from './api';
import { customerLoansKeys } from './queryKeys';
import type { ListCustomerLoansQuery } from './types';

export function useCustomerLoansList(
  query: ListCustomerLoansQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: customerLoansKeys.list(query),
    queryFn: () => fetchCustomerLoans(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
