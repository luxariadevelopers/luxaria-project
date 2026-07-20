import { apiGet, apiPatch, apiPost } from '@/api/client';
import { searchContractors } from '@/api/searchLists';
import type {
  CreateWorkMeasurementInput,
  ListWorkMeasurementsQuery,
  PaginatedWorkMeasurements,
  PublicWorkMeasurement,
  RejectWorkMeasurementInput,
  UpdateWorkMeasurementInput,
  VerifyWorkMeasurementInput,
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
    submittedAt: toIso(row.submittedAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
    boqCode: row.boqCode ?? null,
    drawingReference: row.drawingReference ?? null,
    notes: row.notes ?? null,
    verifiedBy: row.verifiedBy ?? null,
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

/** `PATCH /work-measurements/:id` — `measurement.create` */
export async function updateWorkMeasurement(
  id: string,
  input: UpdateWorkMeasurementInput,
): Promise<PublicWorkMeasurement> {
  const res = await apiPatch<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to update work measurement');
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

/** `POST /work-measurements/:id/verify` — `measurement.certify` */
export async function verifyWorkMeasurement(
  id: string,
  input: VerifyWorkMeasurementInput = {},
): Promise<PublicWorkMeasurement> {
  const res = await apiPost<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}/verify`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to verify work measurement');
  }
  return normaliseMeasurement(res.data);
}

/** `POST /work-measurements/:id/reject` — `measurement.certify` */
export async function rejectWorkMeasurement(
  id: string,
  input: RejectWorkMeasurementInput,
): Promise<PublicWorkMeasurement> {
  const res = await apiPost<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to reject work measurement');
  }
  return normaliseMeasurement(res.data);
}

/** `POST /work-measurements/:id/cancel` — `measurement.create` */
export async function cancelWorkMeasurement(
  id: string,
): Promise<PublicWorkMeasurement> {
  const res = await apiPost<PublicWorkMeasurement>(
    `${BASE}/${encodeURIComponent(id)}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to cancel work measurement');
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
  return (res.data ?? []).map((row) => ({
    id: row.id,
    boqCode: row.boqCode,
    description: row.description,
    status: row.status,
    plannedQuantity: Number(row.plannedQuantity ?? 0),
    unit: row.unit,
  }));
}

/** `GET /contractors` — `contractor.view` */
export async function fetchContractorsForMeasurement(query: {
  search?: string;
  limit?: number;
}): Promise<WorkMeasurementContractorOption[]> {
  const rows = await searchContractors({
    search: query.search ?? '',
    limit: query.limit ?? 50,
  });
  return rows.map((row) => ({
    id: row.id,
    contractorCode: row.contractorCode,
    legalName: row.legalName,
    status: row.status,
  }));
}
