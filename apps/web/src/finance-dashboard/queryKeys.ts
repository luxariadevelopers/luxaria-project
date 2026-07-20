import type { FinanceDashboardQuery } from './types';

export const FINANCE_DASHBOARD_QUERY_KEY = ['finance-dashboard'] as const;

export const financeSummaryQueryKey = (query: FinanceDashboardQuery) =>
  [...FINANCE_DASHBOARD_QUERY_KEY, 'summary', query] as const;
