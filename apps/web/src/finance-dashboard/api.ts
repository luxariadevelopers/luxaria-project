import { apiGet } from '@/api/client';
import type {
  FinanceDashboardQuery,
  FinanceDashboardSummary,
} from './types';

/**
 * `GET /finance-dashboard/summary`
 * Permission: `dashboard.view` (+ project access enforced in the service).
 */
export async function fetchFinanceDashboardSummary(
  query: FinanceDashboardQuery,
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
