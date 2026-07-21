import { apiGet, apiPatch, apiPost } from '@/api/client';

export type SiteIssueType =
  | 'delay'
  | 'material_shortage'
  | 'labour_shortage'
  | 'equipment_failure'
  | 'design_clarification'
  | 'other';

export type SiteIssueStatus = 'open' | 'assigned' | 'resolved' | 'closed';

export type SiteIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type PublicSiteIssue = {
  id: string;
  issueNumber: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  type: SiteIssueType;
  title: string;
  description: string | null;
  status: SiteIssueStatus;
  assigneeUserId: string | null;
  severity: SiteIssueSeverity;
  resolvedAt: string | null;
  closedAt: string | null;
  photoDocumentIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListSiteIssuesQuery = {
  projectId?: string;
  siteId?: string;
  dprId?: string;
  status?: SiteIssueStatus;
  type?: SiteIssueType;
  severity?: SiteIssueSeverity;
  page?: number;
  limit?: number;
};

export type CreateSiteIssueInput = {
  projectId: string;
  siteId?: string | null;
  dprId?: string | null;
  type: SiteIssueType;
  title: string;
  description?: string | null;
  severity?: SiteIssueSeverity;
  photoDocumentIds?: string[];
};

const BASE = '/site-issues';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(row: PublicSiteIssue): PublicSiteIssue {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    siteId: row.siteId == null ? null : String(row.siteId),
    dprId: row.dprId == null ? null : String(row.dprId),
    description: row.description ?? null,
    assigneeUserId:
      row.assigneeUserId == null ? null : String(row.assigneeUserId),
    resolvedAt: toIso(row.resolvedAt),
    closedAt: toIso(row.closedAt),
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /site-issues` — `site_issue.view` */
export async function fetchSiteIssues(
  query: ListSiteIssuesQuery = {},
): Promise<PublicSiteIssue[]> {
  const res = await apiGet<PublicSiteIssue[]>(BASE, {
    projectId: query.projectId,
    siteId: query.siteId,
    dprId: query.dprId,
    status: query.status,
    type: query.type,
    severity: query.severity,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `GET /site-issues/:id` — `site_issue.view` */
export async function fetchSiteIssue(id: string): Promise<PublicSiteIssue> {
  const res = await apiGet<PublicSiteIssue>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'Site issue unavailable');
  return normalise(res.data);
}

/** `POST /site-issues` — `site_issue.create` */
export async function createSiteIssue(
  input: CreateSiteIssueInput,
): Promise<PublicSiteIssue> {
  const res = await apiPost<PublicSiteIssue>(BASE, input);
  if (!res.data) throw new Error(res.message || 'Failed to create site issue');
  return normalise(res.data);
}

/** `PATCH /site-issues/:id` — `site_issue.create` */
export async function updateSiteIssue(
  id: string,
  input: Partial<Omit<CreateSiteIssueInput, 'projectId'>>,
): Promise<PublicSiteIssue> {
  const res = await apiPatch<PublicSiteIssue>(`${BASE}/${id}`, input);
  if (!res.data) throw new Error(res.message || 'Failed to update site issue');
  return normalise(res.data);
}

/** `POST /site-issues/:id/assign` — `site_issue.assign` */
export async function assignSiteIssue(
  id: string,
  assigneeUserId: string,
): Promise<PublicSiteIssue> {
  const res = await apiPost<PublicSiteIssue>(`${BASE}/${id}/assign`, {
    assigneeUserId,
  });
  if (!res.data) throw new Error(res.message || 'Failed to assign site issue');
  return normalise(res.data);
}

/** `POST /site-issues/:id/resolve` — `site_issue.assign` */
export async function resolveSiteIssue(id: string): Promise<PublicSiteIssue> {
  const res = await apiPost<PublicSiteIssue>(`${BASE}/${id}/resolve`, {});
  if (!res.data) throw new Error(res.message || 'Failed to resolve site issue');
  return normalise(res.data);
}

/** `POST /site-issues/:id/close` — `site_issue.close` */
export async function closeSiteIssue(id: string): Promise<PublicSiteIssue> {
  const res = await apiPost<PublicSiteIssue>(`${BASE}/${id}/close`, {});
  if (!res.data) throw new Error(res.message || 'Failed to close site issue');
  return normalise(res.data);
}
