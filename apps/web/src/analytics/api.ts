import { apiGet } from '@/api/client';

export type AnalyticsQuery = {
  projectId?: string;
  date?: string;
  from?: string;
  to?: string;
  horizon?: string | number;
  kpi?: string;
  report?: string;
  format?: 'pdf' | 'excel' | 'csv';
};

export async function fetchAnalytics<T>(
  path: string,
  query: AnalyticsQuery = {},
): Promise<T> {
  const res = await apiGet<T>(path, { ...query });
  if (!res.data) {
    throw new Error(res.message || 'Analytics unavailable');
  }
  return res.data;
}
