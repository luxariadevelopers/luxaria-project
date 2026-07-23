import { apiGet } from '@/api/client';
import type {
  FinanceDashboardQuery,
  FinanceDashboardSummary,
  PublicFinancialYearOption,
} from './types';

/**
 * `GET /finance-dashboard/summary`
 * Permission: `dashboard.view` (+ project access enforced in the service).
 */
export async function fetchFinanceDashboardSummary(
  query: FinanceDashboardQuery = {},
): Promise<FinanceDashboardSummary> {
  const res = await apiGet<FinanceDashboardSummary>(
    '/finance-dashboard/summary',
    { ...query },
  );
  if (!res.data) {
    throw new Error(res.message || 'Finance dashboard summary unavailable');
  }
  return res.data;
}

/**
 * `GET /financial-years` — filter options for auto-selecting current FY.
 * Permission: `financial_year.view`.
 */
export async function fetchFinancialYearFilterOptions(): Promise<
  PublicFinancialYearOption[]
> {
  const res = await apiGet<PublicFinancialYearOption[]>('/financial-years', {
    page: 1,
    limit: 50,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    isCurrent: Boolean(row.isCurrent),
    isLocked: Boolean(row.isLocked),
    status: row.status,
  }));
}
