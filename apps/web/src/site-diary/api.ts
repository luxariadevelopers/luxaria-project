import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';

export type SiteDiaryEntryType =
  | 'meeting'
  | 'delay'
  | 'visitor'
  | 'instruction'
  | 'risk'
  | 'other';

export type PublicSiteDiaryVisitor = {
  id: string;
  name: string;
  organization: string | null;
  purpose: string | null;
};

export type PublicSiteDiaryEntry = {
  id: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  entryDate: string;
  entryType: SiteDiaryEntryType;
  title: string;
  description: string | null;
  visitors: PublicSiteDiaryVisitor[];
  photoDocumentIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListSiteDiaryQuery = {
  projectId?: string;
  siteId?: string;
  dprId?: string;
  entryDate?: string;
  fromDate?: string;
  toDate?: string;
  entryType?: SiteDiaryEntryType;
  page?: number;
  limit?: number;
};

export type CreateSiteDiaryEntryInput = {
  projectId: string;
  siteId?: string | null;
  dprId?: string | null;
  entryDate: string;
  entryType: SiteDiaryEntryType;
  title: string;
  description?: string | null;
  visitors?: Array<{
    name: string;
    organization?: string | null;
    purpose?: string | null;
  }>;
  photoDocumentIds?: string[];
};

const BASE = '/site-diary';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(row: PublicSiteDiaryEntry): PublicSiteDiaryEntry {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    siteId: row.siteId == null ? null : String(row.siteId),
    dprId: row.dprId == null ? null : String(row.dprId),
    entryDate: toIso(row.entryDate) ?? String(row.entryDate),
    description: row.description ?? null,
    visitors: (row.visitors ?? []).map((v) => ({
      id: String(v.id ?? ''),
      name: v.name,
      organization: v.organization ?? null,
      purpose: v.purpose ?? null,
    })),
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /site-diary` — `site_diary.view` */
export async function fetchSiteDiaryEntries(
  query: ListSiteDiaryQuery = {},
): Promise<PublicSiteDiaryEntry[]> {
  const res = await apiGet<PublicSiteDiaryEntry[]>(BASE, {
    projectId: query.projectId,
    siteId: query.siteId,
    dprId: query.dprId,
    entryDate: query.entryDate,
    fromDate: query.fromDate,
    toDate: query.toDate,
    entryType: query.entryType,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `GET /site-diary/:id` — `site_diary.view` */
export async function fetchSiteDiaryEntry(
  id: string,
): Promise<PublicSiteDiaryEntry> {
  const res = await apiGet<PublicSiteDiaryEntry>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'Site diary entry unavailable');
  return normalise(res.data);
}

/** `POST /site-diary` — `site_diary.manage` */
export async function createSiteDiaryEntry(
  input: CreateSiteDiaryEntryInput,
): Promise<PublicSiteDiaryEntry> {
  const res = await apiPost<PublicSiteDiaryEntry>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create diary entry');
  }
  return normalise(res.data);
}

/** `PATCH /site-diary/:id` — `site_diary.manage` */
export async function updateSiteDiaryEntry(
  id: string,
  input: Partial<Omit<CreateSiteDiaryEntryInput, 'projectId'>>,
): Promise<PublicSiteDiaryEntry> {
  const res = await apiPatch<PublicSiteDiaryEntry>(`${BASE}/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to update diary entry');
  }
  return normalise(res.data);
}

/** `DELETE /site-diary/:id` — `site_diary.manage` */
export async function deleteSiteDiaryEntry(id: string): Promise<void> {
  await apiDelete(`${BASE}/${id}`);
}
