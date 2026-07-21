import { useQuery } from '@tanstack/react-query';
import { fetchSalesDashboard } from './api';
import type { SalesDashboardQuery } from './types';

export function useSalesDashboard(
  query: SalesDashboardQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: ['sales-dashboard', query],
    queryFn: () => fetchSalesDashboard(query),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}
