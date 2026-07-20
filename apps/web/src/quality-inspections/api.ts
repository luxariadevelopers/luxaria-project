import { apiGet, apiPatch, apiPost } from '@/api/client';
import { fetchGoodsReceipts } from '@/grns/api';
import { GoodsReceiptStatus } from '@/grns/types';
import type {
  CompleteInspectionResult,
  CompleteQualityInspectionInput,
  CreateQualityInspectionInput,
  InspectableGrnOption,
  ListQualityInspectionsQuery,
  PaginatedQualityInspections,
  PublicQualityInspection,
  PublicVendorQualityScore,
  UpdateQualityInspectionInput,
} from './types';

const BASE = '/quality-inspections';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseInspection(
  row: PublicQualityInspection,
): PublicQualityInspection {
  return {
    ...row,
    inspectionDate: toIso(row.inspectionDate) ?? row.inspectionDate,
    completedAt: toIso(row.completedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    testParameters: row.testParameters ?? [],
    items: row.items ?? [],
    samplePhotos: row.samplePhotos ?? [],
    testDocuments: row.testDocuments ?? [],
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedQualityInspections['meta'] {
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

/** `GET /quality-inspections` — `quality.view` */
export async function fetchQualityInspections(
  query: ListQualityInspectionsQuery = {},
): Promise<PaginatedQualityInspections> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicQualityInspection[]>(BASE, {
    page,
    limit,
    sortOrder: query.sortOrder,
    search: query.search,
    projectId: query.projectId,
    grnId: query.grnId,
    vendorId: query.vendorId,
    status: query.status,
    result: query.result,
  });
  return {
    items: (res.data ?? []).map(normaliseInspection),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /quality-inspections/:id` — `quality.view` */
export async function fetchQualityInspection(
  id: string,
): Promise<PublicQualityInspection> {
  const res = await apiGet<PublicQualityInspection>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Quality inspection unavailable');
  }
  return normaliseInspection(res.data);
}

/** `POST /quality-inspections` — `quality.inspect` */
export async function createQualityInspection(
  input: CreateQualityInspectionInput,
): Promise<PublicQualityInspection> {
  const res = await apiPost<PublicQualityInspection>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Create quality inspection failed');
  }
  return normaliseInspection(res.data);
}

/** `PATCH /quality-inspections/:id` — `quality.inspect` */
export async function updateQualityInspection(
  id: string,
  input: UpdateQualityInspectionInput,
): Promise<PublicQualityInspection> {
  const res = await apiPatch<PublicQualityInspection>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update quality inspection failed');
  }
  return normaliseInspection(res.data);
}

/**
 * `POST /quality-inspections/:id/complete` — `quality.inspect`
 * Records Accepted / Partially Accepted / Rejected / Hold.
 */
export async function completeQualityInspection(
  id: string,
  input: CompleteQualityInspectionInput,
): Promise<CompleteInspectionResult> {
  const res = await apiPost<CompleteInspectionResult>(
    `${BASE}/${encodeURIComponent(id)}/complete`,
    input,
  );
  if (!res.data?.inspection) {
    throw new Error(res.message || 'Complete quality inspection failed');
  }
  return {
    inspection: normaliseInspection(res.data.inspection),
    vendorQualityScore: {
      ...res.data.vendorQualityScore,
      lastInspectionAt: toIso(res.data.vendorQualityScore.lastInspectionAt),
    },
  };
}

/** `POST /quality-inspections/:id/cancel` — `quality.inspect` */
export async function cancelQualityInspection(
  id: string,
): Promise<PublicQualityInspection> {
  const res = await apiPost<PublicQualityInspection>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel quality inspection failed');
  }
  return normaliseInspection(res.data);
}

/** `GET /vendors/:vendorId/quality-score` — `quality.view` */
export async function fetchVendorQualityScore(
  vendorId: string,
): Promise<PublicVendorQualityScore> {
  const res = await apiGet<PublicVendorQualityScore>(
    `/vendors/${encodeURIComponent(vendorId)}/quality-score`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Vendor quality score unavailable');
  }
  return {
    ...res.data,
    lastInspectionAt: toIso(res.data.lastInspectionAt),
  };
}

const INSPECTABLE_GRN_STATUSES = new Set<string>([
  GoodsReceiptStatus.Submitted,
  GoodsReceiptStatus.QualityCheck,
]);

/**
 * `GET /goods-receipts` via `@/grns` — Nest `grn.create`.
 * Filters client-side to submitted / quality_check for the create picker.
 */
export async function fetchInspectableGrns(query: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<InspectableGrnOption[]> {
  const page = await fetchGoodsReceipts({
    projectId: query.projectId,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return page.items
    .filter((row) => INSPECTABLE_GRN_STATUSES.has(row.status))
    .map((row) => ({
      id: row.id,
      grnNumber: row.grnNumber,
      status: row.status,
      vendorId: row.vendorId,
      receivedDate: row.receivedDate ?? null,
    }));
}
