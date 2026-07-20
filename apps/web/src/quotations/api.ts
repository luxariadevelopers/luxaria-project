import { PurchaseRequestStatus } from '@luxaria/shared-types';
import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CreateVendorQuotationInput,
  EligiblePurchaseRequestRow,
  ListVendorQuotationsQuery,
  PaginatedQuotations,
  PublicVendorQuotation,
  PurchaseRequestDetailForQuote,
  ReviseVendorQuotationInput,
  UpdateVendorQuotationInput,
  VendorOption,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  const iso = toIso(value);
  if (!iso) return '';
  return iso.slice(0, 10);
}

function normaliseQuotation(row: PublicVendorQuotation): PublicVendorQuotation {
  return {
    ...row,
    quotationDate: toDateOnly(row.quotationDate) || row.quotationDate,
    validityDate: toDateOnly(row.validityDate) || row.validityDate,
    finalizedAt: toIso(row.finalizedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    quotationDocument: row.quotationDocument
      ? {
          ...row.quotationDocument,
          uploadedAt:
            toIso(row.quotationDocument.uploadedAt) ??
            String(row.quotationDocument.uploadedAt),
        }
      : null,
    items: (row.items ?? []).map((item) => ({ ...item })),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedQuotations['meta'] {
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

/** `GET /vendor-quotations` — `quotation.view` */
export async function fetchVendorQuotations(
  query: ListVendorQuotationsQuery = {},
): Promise<PaginatedQuotations> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicVendorQuotation[]>('/vendor-quotations', {
    page,
    limit,
    search: query.search,
    purchaseRequestId: query.purchaseRequestId,
    vendorId: query.vendorId,
    projectId: query.projectId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normaliseQuotation),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /vendor-quotations/:id` — `quotation.view` */
export async function fetchVendorQuotation(
  id: string,
): Promise<PublicVendorQuotation> {
  const res = await apiGet<PublicVendorQuotation>(
    `/vendor-quotations/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quotation unavailable');
  }
  return normaliseQuotation(res.data);
}

/** `POST /vendor-quotations` — `quotation.manage` */
export async function createVendorQuotation(
  input: CreateVendorQuotationInput,
): Promise<PublicVendorQuotation> {
  const res = await apiPost<PublicVendorQuotation>('/vendor-quotations', input);
  if (!res.data) {
    throw new Error(res.message || 'Vendor quotation create failed');
  }
  return normaliseQuotation(res.data);
}

/** `PATCH /vendor-quotations/:id` — `quotation.manage` */
export async function updateVendorQuotation(
  id: string,
  input: UpdateVendorQuotationInput,
): Promise<PublicVendorQuotation> {
  const res = await apiPatch<PublicVendorQuotation>(
    `/vendor-quotations/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quotation update failed');
  }
  return normaliseQuotation(res.data);
}

/** `POST /vendor-quotations/:id/submit` — `quotation.manage` */
export async function submitVendorQuotation(
  id: string,
): Promise<PublicVendorQuotation> {
  const res = await apiPost<PublicVendorQuotation>(
    `/vendor-quotations/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quotation submit failed');
  }
  return normaliseQuotation(res.data);
}

/** `POST /vendor-quotations/:id/revise` — `quotation.manage` */
export async function reviseVendorQuotation(
  id: string,
  input: ReviseVendorQuotationInput = {},
): Promise<PublicVendorQuotation> {
  const res = await apiPost<PublicVendorQuotation>(
    `/vendor-quotations/${encodeURIComponent(id)}/revise`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quotation revise failed');
  }
  return normaliseQuotation(res.data);
}

/** `POST /vendor-quotations/:id/mark-final` — `quotation.finalize` */
export async function markVendorQuotationFinal(
  id: string,
): Promise<PublicVendorQuotation> {
  const res = await apiPost<PublicVendorQuotation>(
    `/vendor-quotations/${encodeURIComponent(id)}/mark-final`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quotation finalise failed');
  }
  return normaliseQuotation(res.data);
}

/** `POST /vendor-quotations/:id/cancel` — `quotation.manage` */
export async function cancelVendorQuotation(
  id: string,
): Promise<PublicVendorQuotation> {
  const res = await apiPost<PublicVendorQuotation>(
    `/vendor-quotations/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quotation cancel failed');
  }
  return normaliseQuotation(res.data);
}

/**
 * `POST /vendor-quotations/:id/document` — `quotation.manage`
 * Multipart field: `file`.
 */
export async function uploadVendorQuotationDocument(
  id: string,
  file: File,
): Promise<PublicVendorQuotation> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ApiResponse<PublicVendorQuotation>>(
    `/vendor-quotations/${encodeURIComponent(id)}/document`,
    form,
    {
      headers: { 'Content-Type': undefined },
    },
  );
  if (!data.data) {
    throw new Error(data.message || 'Quotation document upload failed');
  }
  return normaliseQuotation(data.data);
}

const ELIGIBLE_PR_STATUSES = [
  PurchaseRequestStatus.Approved,
  PurchaseRequestStatus.Sourcing,
] as const;

/**
 * Approved / sourcing PRs for quotation create.
 * Nest: quotations only against approved or sourcing PRs.
 * Uses `GET /purchase-requests` (`purchase.view`).
 */
export async function fetchEligiblePurchaseRequests(
  projectId: string,
): Promise<EligiblePurchaseRequestRow[]> {
  const rows: EligiblePurchaseRequestRow[] = [];
  for (const status of ELIGIBLE_PR_STATUSES) {
    const res = await apiGet<EligiblePurchaseRequestRow[]>(
      '/purchase-requests',
      {
        page: 1,
        limit: 100,
        projectId,
        status,
      },
    );
    for (const row of res.data ?? []) {
      rows.push({
        id: row.id,
        requestNumber: row.requestNumber,
        projectId: row.projectId,
        status: row.status,
        estimatedTotal: Number(row.estimatedTotal ?? 0),
      });
    }
  }
  rows.sort((a, b) => a.requestNumber.localeCompare(b.requestNumber));
  return rows;
}

/** `GET /purchase-requests/:id` — `purchase.view` */
export async function fetchPurchaseRequestForQuote(
  id: string,
): Promise<PurchaseRequestDetailForQuote> {
  const res = await apiGet<PurchaseRequestDetailForQuote>(
    `/purchase-requests/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Purchase request unavailable');
  }
  return {
    ...res.data,
    items: (res.data.items ?? []).map((item) => ({
      ...item,
      requestedQuantity: Number(item.requestedQuantity),
      approvedQuantity:
        item.approvedQuantity == null ? null : Number(item.approvedQuantity),
      estimatedRate:
        item.estimatedRate == null ? null : Number(item.estimatedRate),
    })),
  };
}

/** `GET /vendors?search=` — `vendor.view` */
export async function searchVendorOptions(
  search = '',
  limit = 50,
): Promise<VendorOption[]> {
  const res = await apiGet<VendorOption[]>('/vendors', {
    page: 1,
    limit,
    search: search.trim() || undefined,
  });
  return (res.data ?? []).map((row) => ({
    id: row.id,
    vendorCode: row.vendorCode,
    legalName: row.legalName,
    status: row.status,
  }));
}
