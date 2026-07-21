import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateRfqInput,
  ListRfqsQuery,
  PaginatedRfqs,
  PublicRfq,
  RfqQuotationResponse,
  UpdateRfqInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseRfq(row: PublicRfq): PublicRfq {
  return {
    ...row,
    companyId: row.companyId ?? null,
    siteId: row.siteId ?? null,
    vendorIds: row.vendorIds ?? [],
    notes: row.notes ?? null,
    closingDate: toIso(row.closingDate) ?? String(row.closingDate),
    issuedAt: toIso(row.issuedAt),
    issuedBy: row.issuedBy ?? null,
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedRfqs['meta'] {
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

const BASE = '/rfqs';

/** `GET /rfqs` — `quotation.view` */
export async function fetchRfqs(query: ListRfqsQuery = {}): Promise<PaginatedRfqs> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicRfq[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    purchaseRequestId: query.purchaseRequestId,
    status: query.status,
    search: query.search || undefined,
  });
  return {
    items: (res.data ?? []).map(normaliseRfq),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /rfqs/:id` — `quotation.view` */
export async function fetchRfq(id: string): Promise<PublicRfq> {
  const res = await apiGet<PublicRfq>(`${BASE}/${encodeURIComponent(id)}`);
  if (!res.data) throw new Error(res.message || 'RFQ unavailable');
  return normaliseRfq(res.data);
}

/** `POST /rfqs` — `quotation.manage` */
export async function createRfq(input: CreateRfqInput): Promise<PublicRfq> {
  const res = await apiPost<PublicRfq>(BASE, input);
  if (!res.data) throw new Error(res.message || 'Create RFQ failed');
  return normaliseRfq(res.data);
}

/** `PATCH /rfqs/:id` — `quotation.manage` */
export async function updateRfq(
  id: string,
  input: UpdateRfqInput,
): Promise<PublicRfq> {
  const res = await apiPatch<PublicRfq>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) throw new Error(res.message || 'Update RFQ failed');
  return normaliseRfq(res.data);
}

/** `POST /rfqs/:id/issue` — `quotation.manage` */
export async function issueRfq(id: string): Promise<PublicRfq> {
  const res = await apiPost<PublicRfq>(
    `${BASE}/${encodeURIComponent(id)}/issue`,
  );
  if (!res.data) throw new Error(res.message || 'Issue RFQ failed');
  return normaliseRfq(res.data);
}

/** `POST /rfqs/:id/close` — `purchase.order` */
export async function closeRfq(id: string): Promise<PublicRfq> {
  const res = await apiPost<PublicRfq>(
    `${BASE}/${encodeURIComponent(id)}/close`,
  );
  if (!res.data) throw new Error(res.message || 'Close RFQ failed');
  return normaliseRfq(res.data);
}

/** `POST /rfqs/:id/cancel` — `quotation.manage` */
export async function cancelRfq(id: string): Promise<PublicRfq> {
  const res = await apiPost<PublicRfq>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) throw new Error(res.message || 'Cancel RFQ failed');
  return normaliseRfq(res.data);
}

/** `GET /rfqs/:id/responses` — `quotation.view` */
export async function fetchRfqResponses(
  id: string,
): Promise<RfqQuotationResponse[]> {
  const res = await apiGet<RfqQuotationResponse[]>(
    `${BASE}/${encodeURIComponent(id)}/responses`,
  );
  return res.data ?? [];
}
