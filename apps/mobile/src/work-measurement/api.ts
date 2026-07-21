import { apiGet, apiPost } from '@/api/client';
import type {
  CreateWorkMeasurementInput,
  ListWorkMeasurementsQuery,
  PaginatedWorkMeasurements,
  PublicWorkMeasurement,
  WorkMeasurementBoqItemOption,
  WorkMeasurementContractorOption,
} from './types';

const BASE = '/work-measurements';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseMeasurement(
  row: PublicWorkMeasurement,
): PublicWorkMeasurement {
  return {
    ...row,
    measurementDate: toIso(row.measurementDate) ?? row.measurementDate,
    verifiedAt: toIso(row.verifiedAt),
    certifiedAt: toIso(row.certifiedAt),
    submittedAt: toIso(row.submittedAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    boqCode: row.boqCode ?? null,
    siteId: row.siteId ?? null,
    dprId: row.dprId ?? null,
    sheetReference: row.sheetReference ?? null,
    workDescription: row.workDescription ?? null,
    drawingReference: row.drawingReference ?? null,
    drawingId: row.drawingId ?? null,
    notes: row.notes ?? null,
    verifiedBy: row.verifiedBy ?? null,
    certifiedBy: row.certifiedBy ?? null,
    submittedBy: row.submittedBy ?? null,
    rejectedBy: row.rejectedBy ?? null,
    rejectionReason: row.rejectionReason ?? null,
    photos: row.photos ?? [],
    previousQuantity: Number(row.previousQuantity ?? 0),
    currentQuantity: Number(row.currentQuantity ?? 0),
    cumulativeQuantity: Number(row.cumulativeQuantity ?? 0),
    boqPlannedQuantity: Number(row.boqPlannedQuantity ?? 0),
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedWorkMeasurements['meta'] {
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

/** `GET /work-measurements` — `measurement.view` */
export async function fetchWorkMeasurements(
  query: ListWorkMeasurementsQuery = {},
): Promise<PaginatedWorkMeasurements> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicWorkMeasurement[]>(BASE, {
    page,
    limit,
    projectId: query.projectId,
    siteId: query.siteId,
    dprId: query.dprId,
    contractorId: query.contractorId,
    boqItemId: query.boqItemId,
    status: query.status,
    fromDate: query.fromDate,
    toDate: query.toDate,
  });
  return {
    items: (res.data ?? []).map(normaliseMeasurement),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /work-measurements/:id` — `measurement.view` */
export async function fetchWorkMeasurement(
  id: string,
): Promise<PublicWorkMeasurement> {
  const res = await apiGet<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Work measurement unavailable');
  }
  return normaliseMeasurement(res.data);
}

/** `POST /work-measurements` — `measurement.create` */
export async function createWorkMeasurement(
  input: CreateWorkMeasurementInput,
): Promise<PublicWorkMeasurement> {
  const res = await apiPost<PublicWorkMeasurement>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create work measurement');
  }
  return normaliseMeasurement(res.data);
}

/** `POST /work-measurements/:id/submit` — `measurement.create` */
export async function submitWorkMeasurement(
  id: string,
): Promise<PublicWorkMeasurement> {
  const res = await apiPost<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to submit work measurement');
  }
  return normaliseMeasurement(res.data);
}

/**
 * Engineer acknowledgment / verify — `POST /work-measurements/:id/verify`
 * Permission: typically `measurement.verify` / certify role (not site capture).
 * Offline enqueue for verify is deferred (see `apps/mobile/src/contractors/README.md`).
 */
export async function acknowledgeWorkMeasurement(
  id: string,
  input: { notes?: string | null } = {},
): Promise<PublicWorkMeasurement> {
  const res = await apiPost<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}/verify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to acknowledge work measurement');
  }
  return normaliseMeasurement(res.data);
}

/** `POST /work-measurements/:id/certify` — `measurement.certify` */
export async function certifyWorkMeasurement(
  id: string,
  input: { notes?: string | null } = {},
): Promise<PublicWorkMeasurement> {
  const res = await apiPost<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}/certify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to certify work measurement');
  }
  return normaliseMeasurement(res.data);
}

/** `GET /boq/projects/:projectId/items` — `boq.view` */
export async function fetchBoqItemsForMeasurement(query: {
  projectId: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<WorkMeasurementBoqItemOption[]> {
  const res = await apiGet<WorkMeasurementBoqItemOption[]>(
    `/boq/projects/${encodeURIComponent(query.projectId)}/items`,
    {
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
      status: 'active',
    },
  );
  return (res.data ?? []).map((row: WorkMeasurementBoqItemOption) => ({
    id: row.id,
    boqCode: row.boqCode,
    description: row.description,
    status: row.status,
    plannedQuantity: Number(row.plannedQuantity ?? 0),
    unit: row.unit,
  }));
}

/** `GET /contractors` — `contractor.view` */
export async function fetchContractorsForMeasurement(query?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<WorkMeasurementContractorOption[]> {
  const res = await apiGet<WorkMeasurementContractorOption[]>('/contractors', {
    search: query?.search,
    page: query?.page ?? 1,
    limit: query?.limit ?? 50,
  });
  return (res.data ?? []).map((row: WorkMeasurementContractorOption) => ({
    id: row.id,
    contractorCode: row.contractorCode,
    legalName: row.legalName,
    status: row.status,
  }));
}
