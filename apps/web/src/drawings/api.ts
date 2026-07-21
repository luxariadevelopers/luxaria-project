import { apiGet, apiPost } from '@/api/client';

export type DrawingStatus = 'draft' | 'issued' | 'superseded' | 'archived';

export type Drawing = {
  id: string;
  projectId: string;
  siteId: string | null;
  drawingNumber: string;
  title: string;
  discipline: string | null;
  revision: string;
  isLatest: boolean;
  supersededById: string | null;
  status: DrawingStatus;
  documentId: string;
  markupDocumentIds: string[];
  issuedAt: string | null;
  notes: string | null;
};

export type ListDrawingsQuery = {
  projectId: string;
  siteId?: string;
  status?: DrawingStatus;
  isLatest?: boolean;
  drawingNumber?: string;
  discipline?: string;
  page?: number;
  limit?: number;
};

export type CreateDrawingInput = {
  projectId: string;
  siteId?: string | null;
  drawingNumber: string;
  title: string;
  discipline?: string | null;
  revision: string;
  documentId: string;
  markupDocumentIds?: string[];
  status?: 'draft' | 'issued';
  issuedAt?: string | null;
  notes?: string | null;
};

export type CreateDrawingRevisionInput = {
  revision: string;
  documentId: string;
  title?: string;
  discipline?: string | null;
  markupDocumentIds?: string[];
  status?: 'draft' | 'issued';
  issuedAt?: string | null;
  notes?: string | null;
};

export async function listDrawings(
  query: ListDrawingsQuery,
): Promise<Drawing[]> {
  const res = await apiGet<Drawing[]>('/drawings', {
    projectId: query.projectId,
    siteId: query.siteId,
    status: query.status,
    isLatest: query.isLatest,
    drawingNumber: query.drawingNumber,
    discipline: query.discipline,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return res.data ?? [];
}

export async function getDrawing(id: string): Promise<Drawing> {
  const res = await apiGet<Drawing>(`/drawings/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Failed to fetch drawing');
  }
  return res.data;
}

export async function createDrawing(
  input: CreateDrawingInput,
): Promise<Drawing> {
  const res = await apiPost<Drawing>('/drawings', input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create drawing');
  }
  return res.data;
}

export async function createDrawingRevision(
  id: string,
  input: CreateDrawingRevisionInput,
): Promise<Drawing> {
  const res = await apiPost<Drawing>(`/drawings/${id}/revisions`, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create drawing revision');
  }
  return res.data;
}

export async function archiveDrawing(id: string): Promise<Drawing> {
  const res = await apiPost<Drawing>(`/drawings/${id}/archive`, {});
  if (!res.data) {
    throw new Error(res.message || 'Failed to archive drawing');
  }
  return res.data;
}
