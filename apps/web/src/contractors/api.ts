import { apiGet, apiPatch, apiPost } from '@/api/client';
import { toContractorListRow } from './listProjection';
import type {
  BlockContractorInput,
  CreateContractorInput,
  ListContractorsQuery,
  PaginatedContractors,
  PublicContractor,
  UpdateContractorInput,
  VerifyContractorInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseContractor(row: PublicContractor): PublicContractor {
  return {
    ...row,
    verifiedAt: toIso(row.verifiedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedContractors['meta'] {
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

/** `GET /contractors` — `contractor.view` */
export async function fetchContractors(
  query: ListContractorsQuery = {},
): Promise<PaginatedContractors> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicContractor[]>('/contractors', {
    ...query,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map((row) =>
      toContractorListRow(normaliseContractor(row)),
    ),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /contractors/:id` — `contractor.view` */
export async function fetchContractor(id: string): Promise<PublicContractor> {
  const res = await apiGet<PublicContractor>(`/contractors/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Contractor unavailable');
  }
  return normaliseContractor(res.data);
}

/** `POST /contractors` — `contractor.manage` */
export async function createContractor(
  input: CreateContractorInput,
): Promise<PublicContractor> {
  const res = await apiPost<PublicContractor>('/contractors', input);
  if (!res.data) {
    throw new Error(res.message || 'Contractor create failed');
  }
  return normaliseContractor(res.data);
}

/** `PATCH /contractors/:id` — `contractor.manage` */
export async function updateContractor(
  id: string,
  input: UpdateContractorInput,
): Promise<PublicContractor> {
  const res = await apiPatch<PublicContractor>(`/contractors/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Contractor update failed');
  }
  return normaliseContractor(res.data);
}

/** `POST /contractors/:id/verify` — `contractor.manage` */
export async function verifyContractor(
  id: string,
  input: VerifyContractorInput,
): Promise<PublicContractor> {
  const res = await apiPost<PublicContractor>(
    `/contractors/${id}/verify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor verify failed');
  }
  return normaliseContractor(res.data);
}

/** `POST /contractors/:id/activate` — `contractor.manage` */
export async function activateContractor(
  id: string,
): Promise<PublicContractor> {
  const res = await apiPost<PublicContractor>(`/contractors/${id}/activate`);
  if (!res.data) {
    throw new Error(res.message || 'Contractor activate failed');
  }
  return normaliseContractor(res.data);
}

/** `POST /contractors/:id/block` — `contractor.manage` */
export async function blockContractor(
  id: string,
  input?: BlockContractorInput,
): Promise<PublicContractor> {
  const res = await apiPost<PublicContractor>(
    `/contractors/${id}/block`,
    input ?? {},
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor block failed');
  }
  return normaliseContractor(res.data);
}
