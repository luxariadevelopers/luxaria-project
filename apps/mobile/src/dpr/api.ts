import { apiGet, apiPost } from '@/api/client';
import type { PublicDailyProgressReport } from './types';

const BASE = '/daily-progress-reports';

export async function listDailyProgressReports(params: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<PublicDailyProgressReport[]> {
  const res = await apiGet<PublicDailyProgressReport[]>(BASE, {
    projectId: params.projectId,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  return res.data ?? [];
}

export async function getDailyProgressReport(id: string): Promise<PublicDailyProgressReport> {
  const res = await apiGet<PublicDailyProgressReport>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'DPR not found');
  return res.data;
}

export async function reviewDailyProgressReport(
  id: string,
  reviewNotes?: string | null,
): Promise<PublicDailyProgressReport> {
  const res = await apiPost<PublicDailyProgressReport>(`${BASE}/${id}/review`, {
    reviewNotes: reviewNotes ?? null,
  });
  if (!res.data) throw new Error(res.message || 'Review failed');
  return res.data;
}
