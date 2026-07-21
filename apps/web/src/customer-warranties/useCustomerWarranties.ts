import { useQuery } from '@tanstack/react-query';
import { fetchCustomerWarranties } from './api';
import { customerWarrantiesKeys } from './queryKeys';
import type { ListCustomerWarrantiesQuery } from './types';

export function useCustomerWarrantiesList(
  query: ListCustomerWarrantiesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: customerWarrantiesKeys.list(query),
    queryFn: () => fetchCustomerWarranties(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
