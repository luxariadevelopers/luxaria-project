import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import { downloadBlob } from '@/export/downloadBlob';
import { fetchExportBinary } from '@/export/fetchExportBinary';
import type {
  ActivateBoqVersionInput,
  ApproveBoqVersionInput,
  BoqHierarchyBlock,
  BoqImportResult,
  BoqProjectTotalsResult,
  BoqVersionComparison,
  CreateBoqItemInput,
  CreateBoqVersionInput,
  PublicBoqItem,
  PublicBoqVersion,
  RejectBoqVersionInput,
  UpdateBoqItemInput,
  UpdateBoqVersionInput,
} from './types';

const BASE = '/boq';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseItem(row: PublicBoqItem): PublicBoqItem {
  return {
    ...row,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    materialCoefficients: row.materialCoefficients ?? [],
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

function normaliseVersion(row: PublicBoqVersion): PublicBoqVersion {
  return {
    ...row,
    effectiveDate: toIso(row.effectiveDate) ?? row.effectiveDate,
    submittedAt: toIso(row.submittedAt),
    approvedAt: toIso(row.approvedAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: row.createdAt
      ? (toIso(row.createdAt) ?? undefined)
      : undefined,
    updatedAt: row.updatedAt
      ? (toIso(row.updatedAt) ?? undefined)
      : undefined,
  };
}

/** `GET /boq/projects/:projectId/hierarchy` — `boq.view` */
export async function fetchBoqHierarchy(
  projectId: string,
): Promise<BoqHierarchyBlock[]> {
  const res = await apiGet<BoqHierarchyBlock[]>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/hierarchy`,
  );
  return (res.data ?? []).map((block) => ({
    ...block,
    floors: (block.floors ?? []).map((floor) => ({
      ...floor,
      workCategories: (floor.workCategories ?? []).map((cat) => ({
        ...cat,
        items: (cat.items ?? []).map(normaliseItem),
      })),
    })),
  }));
}

/** `POST /boq/projects/:projectId/validate-totals` — `boq.view` */
export async function validateBoqTotals(
  projectId: string,
): Promise<BoqProjectTotalsResult> {
  const res = await apiPost<BoqProjectTotalsResult>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/validate-totals`,
  );
  if (!res.data) {
    throw new Error(res.message || 'BOQ totals validation unavailable');
  }
  return {
    ...res.data,
    totals: {
      itemCount: Number(res.data.totals.itemCount ?? 0),
      plannedQuantity: Number(res.data.totals.plannedQuantity ?? 0),
      materialCost: Number(res.data.totals.materialCost ?? 0),
      labourCost: Number(res.data.totals.labourCost ?? 0),
      subcontractCost: Number(res.data.totals.subcontractCost ?? 0),
      otherCost: Number(res.data.totals.otherCost ?? 0),
      plannedValue: Number(res.data.totals.plannedValue ?? 0),
    },
    invalidCount: Number(res.data.invalidCount ?? 0),
    invalidItems: res.data.invalidItems ?? [],
  };
}

/** `GET /boq/import-template` — `boq.view` (xlsx) */
export async function downloadBoqImportTemplate(): Promise<string> {
  const result = await fetchExportBinary({
    url: `${BASE}/import-template`,
    format: 'xlsx',
    fallbackFilename: 'boq-import-template.xlsx',
  });
  downloadBlob(result.blob, result.filename);
  return result.filename;
}

/** `POST /boq/projects/:projectId/import` — `boq.manage` (multipart `file`) */
export async function importBoqExcel(
  projectId: string,
  file: File,
): Promise<BoqImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data: res } = await apiClient.post(
    `${BASE}/projects/${encodeURIComponent(projectId)}/import`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  const envelope = res as {
    data?: BoqImportResult;
    message?: string;
  };
  if (!envelope.data) {
    throw new Error(envelope.message || 'BOQ import failed');
  }
  return {
    ...envelope.data,
    items: (envelope.data.items ?? []).map(normaliseItem),
  };
}

/** `GET /boq/items/:id` — `boq.view` */
export async function fetchBoqItem(id: string): Promise<PublicBoqItem> {
  const res = await apiGet<PublicBoqItem>(
    `${BASE}/items/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'BOQ item unavailable');
  }
  return normaliseItem(res.data);
}

/** `POST /boq/projects/:projectId/items` — `boq.manage` */
export async function createBoqItem(
  projectId: string,
  input: CreateBoqItemInput,
): Promise<PublicBoqItem> {
  const res = await apiPost<PublicBoqItem>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/items`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to create BOQ item');
  }
  return normaliseItem(res.data);
}

/** `PATCH /boq/items/:id` — `boq.manage` */
export async function updateBoqItem(
  id: string,
  input: UpdateBoqItemInput,
): Promise<PublicBoqItem> {
  const res = await apiPatch<PublicBoqItem>(
    `${BASE}/items/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to update BOQ item');
  }
  return normaliseItem(res.data);
}

/** `GET /boq/projects/:projectId/versions` — `boq.view` */
export async function fetchBoqVersions(
  projectId: string,
): Promise<PublicBoqVersion[]> {
  const res = await apiGet<PublicBoqVersion[]>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/versions`,
  );
  return (res.data ?? []).map(normaliseVersion);
}

/** `GET /boq/projects/:projectId/versions/active` — `boq.view` */
export async function fetchActiveBoqVersion(
  projectId: string,
): Promise<PublicBoqVersion | null> {
  const res = await apiGet<PublicBoqVersion | null>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/versions/active`,
  );
  return res.data ? normaliseVersion(res.data) : null;
}

/** `GET /boq/versions/:id` — `boq.view` */
export async function fetchBoqVersion(
  id: string,
): Promise<PublicBoqVersion> {
  const res = await apiGet<PublicBoqVersion>(
    `${BASE}/versions/${encodeURIComponent(id)}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'BOQ version unavailable');
  }
  return normaliseVersion(res.data);
}

/** `POST /boq/projects/:projectId/versions` — `boq.manage` */
export async function createBoqVersion(
  projectId: string,
  input: CreateBoqVersionInput,
): Promise<PublicBoqVersion> {
  const res = await apiPost<PublicBoqVersion>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/versions`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to create BOQ version');
  }
  return normaliseVersion(res.data);
}

/** `PATCH /boq/versions/:id` — `boq.manage` */
export async function updateBoqVersion(
  id: string,
  input: UpdateBoqVersionInput,
): Promise<PublicBoqVersion> {
  const res = await apiPatch<PublicBoqVersion>(
    `${BASE}/versions/${encodeURIComponent(id)}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to update BOQ version');
  }
  return normaliseVersion(res.data);
}

/** `POST /boq/versions/:id/submit` — `boq.manage` */
export async function submitBoqVersion(
  id: string,
): Promise<PublicBoqVersion> {
  const res = await apiPost<PublicBoqVersion>(
    `${BASE}/versions/${encodeURIComponent(id)}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to submit BOQ version');
  }
  return normaliseVersion(res.data);
}

/** `POST /boq/versions/:id/approve` — `boq.approve` */
export async function approveBoqVersion(
  id: string,
  input: ApproveBoqVersionInput,
): Promise<PublicBoqVersion> {
  const res = await apiPost<PublicBoqVersion>(
    `${BASE}/versions/${encodeURIComponent(id)}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to approve BOQ version');
  }
  return normaliseVersion(res.data);
}

/** `POST /boq/versions/:id/reject` — `boq.approve` */
export async function rejectBoqVersion(
  id: string,
  input: RejectBoqVersionInput,
): Promise<PublicBoqVersion> {
  const res = await apiPost<PublicBoqVersion>(
    `${BASE}/versions/${encodeURIComponent(id)}/reject`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to reject BOQ version');
  }
  return normaliseVersion(res.data);
}

/** `POST /boq/versions/:id/activate` — `boq.manage` (blocked for Variation) */
export async function activateBoqVersion(
  id: string,
  input: ActivateBoqVersionInput = {},
): Promise<PublicBoqVersion> {
  const res = await apiPost<PublicBoqVersion>(
    `${BASE}/versions/${encodeURIComponent(id)}/activate`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to activate BOQ version');
  }
  return normaliseVersion(res.data);
}

/** `GET /boq/projects/:projectId/versions/compare` — `boq.view` */
export async function compareBoqVersions(
  projectId: string,
  fromVersionId: string,
  toVersionId: string,
): Promise<BoqVersionComparison> {
  const res = await apiGet<BoqVersionComparison>(
    `${BASE}/projects/${encodeURIComponent(projectId)}/versions/compare`,
    { fromVersionId, toVersionId },
  );
  if (!res.data) {
    throw new Error(res.message || 'BOQ comparison unavailable');
  }
  return {
    ...res.data,
    fromVersion: normaliseVersion(res.data.fromVersion),
    toVersion: normaliseVersion(res.data.toVersion),
    added: res.data.added ?? [],
    removed: res.data.removed ?? [],
    changed: res.data.changed ?? [],
  };
}
