import { apiGet, apiPatch, apiPost } from '@/api/client';

export type SiteSafetyType =
  | 'near_miss'
  | 'accident'
  | 'ppe'
  | 'toolbox_talk'
  | 'safety_inspection';

export type SiteSafetyStatus = 'open' | 'investigating' | 'closed';

export type SiteSafetySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SiteSafety = {
  id: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  type: SiteSafetyType;
  title: string;
  description: string;
  severity: SiteSafetySeverity;
  status: SiteSafetyStatus;
  ppeChecklist: Array<{
    item: string;
    compliant: boolean;
    notes: string | null;
  }> | null;
  attendees: Array<{ name: string; role: string | null }>;
  investigationNotes: string | null;
  createdAt?: string;
};

export type CreateSiteSafetyInput = {
  projectId: string;
  siteId?: string | null;
  dprId?: string | null;
  type: SiteSafetyType;
  title: string;
  description?: string;
  severity?: SiteSafetySeverity;
  ppeChecklist?: Array<{
    item: string;
    compliant?: boolean;
    notes?: string | null;
  }> | null;
  attendees?: Array<{
    userId?: string | null;
    name: string;
    role?: string | null;
  }>;
  photoDocumentIds?: string[];
};

export type UpdateSiteSafetyInput = {
  siteId?: string | null;
  dprId?: string | null;
  title?: string;
  description?: string;
  severity?: SiteSafetySeverity;
  ppeChecklist?: Array<{
    item: string;
    compliant?: boolean;
    notes?: string | null;
  }> | null;
  attendees?: Array<{
    userId?: string | null;
    name: string;
    role?: string | null;
  }>;
  photoDocumentIds?: string[];
  investigationNotes?: string | null;
};

/** `GET /site-safety` — `safety.view` */
export async function listSiteSafety(
  projectId: string,
): Promise<SiteSafety[]> {
  const res = await apiGet<SiteSafety[]>('/site-safety', { projectId });
  return res.data ?? [];
}

/** `GET /site-safety/:id` — `safety.view` */
export async function getSiteSafety(id: string): Promise<SiteSafety> {
  const res = await apiGet<SiteSafety>(`/site-safety/${id}`);
  if (!res.data) throw new Error(res.message || 'Failed to load site safety');
  return res.data;
}

/** `POST /site-safety` — `safety.manage` */
export async function createSiteSafety(
  input: CreateSiteSafetyInput,
): Promise<SiteSafety> {
  const res = await apiPost<SiteSafety>('/site-safety', input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create site safety');
  }
  return res.data;
}

/** `PATCH /site-safety/:id` — `safety.manage` */
export async function updateSiteSafety(
  id: string,
  input: UpdateSiteSafetyInput,
): Promise<SiteSafety> {
  const res = await apiPatch<SiteSafety>(`/site-safety/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to update site safety');
  }
  return res.data;
}

/** `POST /site-safety/:id/investigate` — `safety.manage` */
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

/** `POST /site-safety/:id/close` — `safety.manage` */
export async function closeSiteSafety(id: string): Promise<SiteSafety> {
  const res = await apiPost<SiteSafety>(`/site-safety/${id}/close`, {});
  if (!res.data) throw new Error(res.message || 'Failed to close record');
  return res.data;
}
