import { apiGet, apiPost } from '@/api/client';
import type {
  GenerateQuotationComparisonInput,
  ListQuotationComparisonsQuery,
  PaginatedQuotationComparisons,
  PublicQuotationComparison,
  RecommendQuotationComparisonInput,
} from './types';

const BASE = '/quotation-comparisons';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(
  row: PublicQuotationComparison,
): PublicQuotationComparison {
  return {
    ...row,
    recommendedAt: toIso(row.recommendedAt),
    submittedAt: toIso(row.submittedAt),
    pdfGeneratedAt: toIso(row.pdfGeneratedAt),
    generatedAt: toIso(row.generatedAt) ?? row.generatedAt,
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedQuotationComparisons['meta'] {
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

/** `GET /quotation-comparisons` — `quotation.compare` */
export async function fetchQuotationComparisons(
  query: ListQuotationComparisonsQuery = {},
): Promise<PaginatedQuotationComparisons> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicQuotationComparison[]>(BASE, {
    page,
    limit,
    search: query.search,
    purchaseRequestId: query.purchaseRequestId,
    projectId: query.projectId,
    status: query.status,
  });
  return {
    items: (res.data ?? []).map(normalise),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /quotation-comparisons/:id` — `quotation.compare` */
export async function fetchQuotationComparison(
  id: string,
): Promise<PublicQuotationComparison> {
  const res = await apiGet<PublicQuotationComparison>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Quotation comparison unavailable');
  }
  return normalise(res.data);
}

/**
 * Latest non-cancelled comparison for a purchase request
 * (`GET /quotation-comparisons?purchaseRequestId=`).
 */
export async function fetchComparisonForPurchaseRequest(
  purchaseRequestId: string,
): Promise<PublicQuotationComparison | null> {
  const page = await fetchQuotationComparisons({
    purchaseRequestId,
    page: 1,
    limit: 20,
  });
  const active = page.items.find((row) => row.status !== 'cancelled');
  return active ?? page.items[0] ?? null;
}

/** `POST /quotation-comparisons/generate` — `quotation.compare` */
export async function generateQuotationComparison(
  input: GenerateQuotationComparisonInput,
): Promise<PublicQuotationComparison> {
  const res = await apiPost<PublicQuotationComparison>(
    `${BASE}/generate`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Generate comparison failed');
  }
  return normalise(res.data);
}

/** `POST /quotation-comparisons/:id/recommend` — `quotation.recommend` */
export async function recommendQuotationComparison(
  id: string,
  input: RecommendQuotationComparisonInput,
): Promise<PublicQuotationComparison> {
  const res = await apiPost<PublicQuotationComparison>(
    `${BASE}/${id}/recommend`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Recommend vendor failed');
  }
  return normalise(res.data);
}

/** `POST /quotation-comparisons/:id/submit-approval` — `quotation.recommend` */
export async function submitQuotationComparisonForApproval(
  id: string,
): Promise<PublicQuotationComparison> {
  const res = await apiPost<PublicQuotationComparison>(
    `${BASE}/${id}/submit-approval`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit for approval failed');
  }
  return normalise(res.data);
}

/** `POST /quotation-comparisons/:id/cancel` — `quotation.compare` */
export async function cancelQuotationComparison(
  id: string,
): Promise<PublicQuotationComparison> {
  const res = await apiPost<PublicQuotationComparison>(`${BASE}/${id}/cancel`);
  if (!res.data) {
    throw new Error(res.message || 'Cancel comparison failed');
  }
  return normalise(res.data);
}
