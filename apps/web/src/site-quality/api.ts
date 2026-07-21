import { apiGet, apiPost } from '@/api/client';

export type SiteQualityStatus =
  | 'inspection'
  | 'ncr'
  | 'punch_list'
  | 'rectification'
  | 're_inspection'
  | 'closed'
  | 'cancelled';

export type SiteQuality = {
  id: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  boqItemId: string | null;
  title: string;
  description: string;
  status: SiteQualityStatus;
  findings: string | null;
  ncrNumber: string | null;
  punchItems: Array<{
    id: string;
    description: string;
    status: string;
  }>;
  rectificationNotes: string | null;
  reinspectedAt: string | null;
  createdAt?: string;
};

export async function listSiteQuality(
  projectId: string,
): Promise<SiteQuality[]> {
  const res = await apiGet<SiteQuality[]>('/site-quality', { projectId });
  return res.data ?? [];
}

export async function getSiteQuality(id: string): Promise<SiteQuality> {
  const res = await apiGet<SiteQuality>(`/site-quality/${id}`);
  if (!res.data) throw new Error(res.message || 'Failed to load site quality');
  return res.data;
}

export async function raiseSiteQualityNcr(
  id: string,
  findings?: string | null,
): Promise<SiteQuality> {
  const res = await apiPost<SiteQuality>(`/site-quality/${id}/raise-ncr`, {
    findings: findings ?? null,
  });
  if (!res.data) throw new Error(res.message || 'Failed to raise NCR');
  return res.data;
}

export async function closeSiteQuality(id: string): Promise<SiteQuality> {
  const res = await apiPost<SiteQuality>(`/site-quality/${id}/close`, {});
  if (!res.data) throw new Error(res.message || 'Failed to close record');
  return res.data;
}
