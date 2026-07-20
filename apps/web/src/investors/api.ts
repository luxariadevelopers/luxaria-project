import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import { toInvestorListRow } from './listProjection';
import type {
  CreateInvestorInput,
  ListInvestorsQuery,
  PaginatedInvestors,
  PublicInvestor,
  PublicInvestorDocument,
  UpdateInvestorInput,
  VerifyKycInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseInvestor(row: PublicInvestor): PublicInvestor {
  return {
    ...row,
    kycVerifiedAt: toIso(row.kycVerifiedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedInvestors['meta'] {
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

/** `GET /investors` — `investor.view` (scoped unless `investor.view_all`) */
export async function fetchInvestors(
  query: ListInvestorsQuery = {},
): Promise<PaginatedInvestors> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicInvestor[]>('/investors', {
    ...query,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map((row) =>
      toInvestorListRow(normaliseInvestor(row)),
    ),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /investors/:id` — `investor.view` (scoped; bank decrypt for owner / view_all) */
export async function fetchInvestor(id: string): Promise<PublicInvestor> {
  const res = await apiGet<PublicInvestor>(`/investors/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Investor unavailable');
  }
  return normaliseInvestor(res.data);
}

/** `GET /investors/:id/documents` — `investor.view` */
export async function fetchInvestorDocuments(
  investorId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PublicInvestorDocument[]> {
  const res = await apiGet<PublicInvestorDocument[]>(
    `/investors/${investorId}/documents`,
    {
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    },
  );
  return (res.data ?? []).map(normaliseDocument);
}

/**
 * `POST /investors/:id/documents` — `investor.upload_document`
 * Multipart: `file` + optional `category`.
 */
export async function uploadInvestorDocument(
  investorId: string,
  file: File,
  category?: string,
): Promise<PublicInvestorDocument> {
  const form = new FormData();
  form.append('file', file);
  if (category) {
    form.append('category', category);
  }
  const { data } = await apiClient.post<ApiResponse<PublicInvestorDocument>>(
    `/investors/${investorId}/documents`,
    form,
    {
      headers: { 'Content-Type': undefined },
    },
  );
  if (!data.data) {
    throw new Error(data.message || 'Document upload failed');
  }
  return normaliseDocument(data.data);
}

function normaliseDocument(row: PublicInvestorDocument): PublicInvestorDocument {
  return {
    ...row,
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
  };
}

/** `POST /investors` — `investor.create` */
export async function createInvestor(
  input: CreateInvestorInput,
): Promise<PublicInvestor> {
  const res = await apiPost<PublicInvestor>('/investors', input);
  if (!res.data) {
    throw new Error(res.message || 'Investor create failed');
  }
  return normaliseInvestor(res.data);
}

/** `PATCH /investors/:id` — `investor.update` */
export async function updateInvestor(
  id: string,
  input: UpdateInvestorInput,
): Promise<PublicInvestor> {
  const res = await apiPatch<PublicInvestor>(`/investors/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Investor update failed');
  }
  return normaliseInvestor(res.data);
}

/** `POST /investors/:id/verify-kyc` — `investor.verify_kyc` */
export async function verifyInvestorKyc(
  id: string,
  input: VerifyKycInput,
): Promise<PublicInvestor> {
  const res = await apiPost<PublicInvestor>(`/investors/${id}/verify-kyc`, input);
  if (!res.data) {
    throw new Error(res.message || 'KYC update failed');
  }
  return normaliseInvestor(res.data);
}

/** `POST /investors/:id/activate` — `investor.activate` */
export async function activateInvestor(id: string): Promise<PublicInvestor> {
  const res = await apiPost<PublicInvestor>(`/investors/${id}/activate`);
  if (!res.data) {
    throw new Error(res.message || 'Activation failed');
  }
  return normaliseInvestor(res.data);
}

/** `POST /investors/:id/deactivate` — `investor.activate` */
export async function deactivateInvestor(id: string): Promise<PublicInvestor> {
  const res = await apiPost<PublicInvestor>(`/investors/${id}/deactivate`);
  if (!res.data) {
    throw new Error(res.message || 'Deactivation failed');
  }
  return normaliseInvestor(res.data);
}
