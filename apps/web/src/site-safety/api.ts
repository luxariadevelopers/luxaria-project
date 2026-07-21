import { apiGet, apiPost } from '@/api/client';

export type SiteSafetyType =
  | 'near_miss'
  | 'accident'
  | 'ppe'
  | 'toolbox_talk'
  | 'safety_inspection';

export type SiteSafetyStatus = 'open' | 'investigating' | 'closed';

export type SiteSafety = {
  id: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  type: SiteSafetyType;
  title: string;
  description: string;
  severity: string;
  status: SiteSafetyStatus;
  attendees: Array<{ name: string; role: string | null }>;
  investigationNotes: string | null;
  createdAt?: string;
};

export async function listSiteSafety(
  projectId: string,
): Promise<SiteSafety[]> {
  const res = await apiGet<SiteSafety[]>('/site-safety', { projectId });
  return res.data ?? [];
}

export async function getSiteSafety(id: string): Promise<SiteSafety> {
  const res = await apiGet<SiteSafety>(`/site-safety/${id}`);
  if (!res.data) throw new Error(res.message || 'Failed to load site safety');
  return res.data;
}

export async function investigateSiteSafety(
  id: string,
  investigationNotes?: string | null,
): Promise<SiteSafety> {
  const res = await apiPost<SiteSafety>(`/site-safety/${id}/investigate`, {
    investigationNotes: investigationNotes ?? null,
  });
  if (!res.data) {
    throw new Error(res.message || 'Failed to start investigation');
  }
  return res.data;
}

export async function closeSiteSafety(id: string): Promise<SiteSafety> {
  const res = await apiPost<SiteSafety>(`/site-safety/${id}/close`, {});
  if (!res.data) throw new Error(res.message || 'Failed to close record');
  return res.data;
}
