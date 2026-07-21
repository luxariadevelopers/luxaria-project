import { useQuery } from '@tanstack/react-query';
import { fetchSaleAgreements } from './api';
import { saleAgreementsKeys } from './queryKeys';
import type { ListSaleAgreementsQuery } from './types';

export function useSaleAgreementsList(
  query: ListSaleAgreementsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: saleAgreementsKeys.list(query),
    queryFn: () => fetchSaleAgreements(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}
