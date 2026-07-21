import { apiGet } from '@/api/client';
import type { SalesDashboardKpis, SalesDashboardQuery } from './types';

/** `GET /sales/dashboard` — `sales_report.view` */
export async function fetchSalesDashboard(
  query: SalesDashboardQuery = {},
): Promise<SalesDashboardKpis> {
  const res = await apiGet<SalesDashboardKpis>('/sales/dashboard', {
    projectId: query.projectId || undefined,
    companyId: query.companyId || undefined,
  });
  if (!res.data) {
    throw new Error(res.message || 'Sales dashboard unavailable');
  }
  return res.data;
}
