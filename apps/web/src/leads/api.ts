import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateLeadInput,
  LeadListRow,
  ListLeadsQuery,
  PaginatedLeads,
  PublicLead,
  TransitionLeadInput,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return toIso(value) ?? null;
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedLeads['meta'] {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

function toListRow(row: PublicLead): LeadListRow {
  return {
    id: row.id,
    leadNumber: row.leadNumber,
    projectId: row.projectId,
    source: row.source,
    status: row.status,
    contact: row.contact,
    assignedTo: row.assignedTo,
    convertedCustomerId: row.convertedCustomerId,
    createdAt: row.createdAt,
  };
}

function normaliseLead(row: PublicLead): PublicLead {
  return {
    ...row,
    siteVisitAt: toIsoOrNull(row.siteVisitAt),
    wonAt: toIsoOrNull(row.wonAt),
    lostAt: toIsoOrNull(row.lostAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** `GET /leads` — `lead.view` */
export async function fetchLeads(
  query: ListLeadsQuery = {},
): Promise<PaginatedLeads> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicLead[]>('/leads', {
    page,
    limit,
    search: query.search || undefined,
    projectId: query.projectId || undefined,
    status: query.status || undefined,
    source: query.source || undefined,
    assignedTo: query.assignedTo || undefined,
  });
  return {
    items: (res.data ?? []).map((row) => toListRow(normaliseLead(row))),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /leads/:id` — `lead.view` */
export async function fetchLead(id: string): Promise<PublicLead> {
  const res = await apiGet<PublicLead>(`/leads/${encodeURIComponent(id)}`);
  if (!res.data) throw new Error('Lead not found');
  return normaliseLead(res.data);
}

/** `POST /leads` — `lead.manage` */
export async function createLead(input: CreateLeadInput): Promise<PublicLead> {
  const res = await apiPost<PublicLead>('/leads', input);
  if (!res.data) throw new Error('Create lead failed');
  return normaliseLead(res.data);
}

/** `PATCH /leads/:id` — `lead.manage` */
export async function updateLead(
  id: string,
  input: Partial<CreateLeadInput>,
): Promise<PublicLead> {
  const res = await apiPatch<PublicLead>(
    `/leads/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) throw new Error('Update lead failed');
  return normaliseLead(res.data);
}

/** `POST /leads/:id/transition` — `lead.manage` */
export async function transitionLead(
  id: string,
  input: TransitionLeadInput,
): Promise<PublicLead> {
  const res = await apiPost<PublicLead>(
    `/leads/${encodeURIComponent(id)}/transition`,
    input,
  );
  if (!res.data) throw new Error('Transition lead failed');
  return normaliseLead(res.data);
}
