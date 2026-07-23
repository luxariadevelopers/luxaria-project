import { apiGet, apiPatch, apiPost } from '@/api/client';

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

export type CreateSiteQualityInput = {
  projectId: string;
  siteId?: string | null;
  dprId?: string | null;
  boqItemId?: string | null;
  title: string;
  description?: string;
  findings?: string | null;
  photoDocumentIds?: string[];
  punchItems?: Array<{
    description: string;
    status?: string;
    location?: string | null;
    assignedTo?: string | null;
    dueDate?: string | null;
  }>;
};

export type UpdateSiteQualityInput = {
  siteId?: string | null;
  dprId?: string | null;
  boqItemId?: string | null;
  title?: string;
  description?: string;
  findings?: string | null;
  photoDocumentIds?: string[];
  punchItems?: Array<{
    description: string;
    status?: string;
    location?: string | null;
    assignedTo?: string | null;
    dueDate?: string | null;
  }>;
  rectificationNotes?: string | null;
};

/** `GET /site-quality` — `site_quality.view` */
export async function listSiteQuality(
  projectId: string,
): Promise<SiteQuality[]> {
  const res = await apiGet<SiteQuality[]>('/site-quality', { projectId });
  return res.data ?? [];
}

/** `GET /site-quality/:id` — `site_quality.view` */
export async function getSiteQuality(id: string): Promise<SiteQuality> {
  const res = await apiGet<SiteQuality>(`/site-quality/${id}`);
  if (!res.data) throw new Error(res.message || 'Failed to load site quality');
  return res.data;
}

/** `POST /site-quality` — `site_quality.manage` */
export async function createSiteQuality(
  input: CreateSiteQualityInput,
): Promise<SiteQuality> {
  const res = await apiPost<SiteQuality>('/site-quality', input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create site quality');
  }
  return res.data;
}

/** `PATCH /site-quality/:id` — `site_quality.manage` */
export async function updateSiteQuality(
  id: string,
  input: UpdateSiteQualityInput,
): Promise<SiteQuality> {
  const res = await apiPatch<SiteQuality>(`/site-quality/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to update site quality');
  }
  return res.data;
}

/** `POST /site-quality/:id/raise-ncr` — `site_quality.manage` */
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

/** `POST /site-quality/:id/close` — `site_quality.close` */
export async function closeSiteQuality(id: string): Promise<SiteQuality> {
  const res = await apiPost<SiteQuality>(`/site-quality/${id}/close`, {});
  if (!res.data) throw new Error(res.message || 'Failed to close record');
  return res.data;
}
