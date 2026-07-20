import { useQuery } from '@tanstack/react-query';
import { fetchFinanceDashboardSummary } from './api';
import { financeSummaryQueryKey } from './queryKeys';
import type { FinanceDashboardQuery } from './types';

/**
 * Loads finance summary only when a financial year is selected
 * (UI rule — API treats `financialYearId` as optional).
 */
export function useFinanceDashboardSummary(
  query: FinanceDashboardQuery,
  enabled = true,
) {
  const hasFinancialYear = Boolean(query.financialYearId);
  return useQuery({
    queryKey: financeSummaryQueryKey(query),
    queryFn: () => fetchFinanceDashboardSummary(query),
    enabled: enabled && hasFinancialYear,
    staleTime: 30_000,
    retry: false,
  });
}
