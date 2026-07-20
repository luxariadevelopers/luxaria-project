import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ApproveMaterialConsumptionReportInput,
  GenerateMaterialConsumptionReportInput,
  ListMaterialConsumptionReportsQuery,
  MaterialConsumptionPreview,
  MaterialConsumptionReport,
  PreviewMaterialConsumptionQuery,
  UpdateMaterialConsumptionReportInput,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normaliseLine(
  line: MaterialConsumptionReport['lines'][number],
): MaterialConsumptionReport['lines'][number] {
  return {
    ...line,
    explanation: line.explanation ?? null,
    explainedAt: line.explainedAt ?? null,
    explainedBy: line.explainedBy ?? null,
    alerts: line.alerts ?? [],
  };
}

function normaliseReport(row: MaterialConsumptionReport): MaterialConsumptionReport {
  return {
    ...row,
    periodFrom: toIso(row.periodFrom),
    periodTo: toIso(row.periodTo),
    asOfDate: toIso(row.asOfDate) ?? row.asOfDate,
    submittedAt: row.submittedAt ?? null,
    approvedAt: row.approvedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    notes: row.notes ?? null,
    approvalComment: row.approvalComment ?? null,
    lines: (row.lines ?? []).map(normaliseLine),
  };
}

/** `GET /material-consumption-reports/preview` — `material_consumption.view` */
export async function previewMaterialConsumption(
  query: PreviewMaterialConsumptionQuery,
): Promise<MaterialConsumptionPreview> {
  const res = await apiGet<MaterialConsumptionPreview>(
    '/material-consumption-reports/preview',
    query,
  );
  if (!res.data) {
    throw new Error(res.message || 'Material consumption preview unavailable');
  }
  return {
    ...res.data,
    periodFrom: toIso(res.data.periodFrom),
    periodTo: toIso(res.data.periodTo),
    asOfDate: toIso(res.data.asOfDate) ?? res.data.asOfDate,
    lines: (res.data.lines ?? []).map(normaliseLine),
  };
}

/** `POST /material-consumption-reports` — `material_consumption.manage` */
export async function generateMaterialConsumptionReport(
  input: GenerateMaterialConsumptionReportInput,
): Promise<MaterialConsumptionReport> {
  const res = await apiPost<MaterialConsumptionReport>(
    '/material-consumption-reports',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Generate material consumption report failed');
  }
  return normaliseReport(res.data);
}

/** `GET /material-consumption-reports` — `material_consumption.view` */
export async function listMaterialConsumptionReports(
  query: ListMaterialConsumptionReportsQuery = {},
): Promise<MaterialConsumptionReport[]> {
  const res = await apiGet<MaterialConsumptionReport[]>(
    '/material-consumption-reports',
    query,
  );
  return (res.data ?? []).map(normaliseReport);
}

/** `GET /material-consumption-reports/:id` — `material_consumption.view` */
export async function fetchMaterialConsumptionReport(
  id: string,
): Promise<MaterialConsumptionReport> {
  const res = await apiGet<MaterialConsumptionReport>(
    `/material-consumption-reports/${id}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Material consumption report unavailable');
  }
  return normaliseReport(res.data);
}

/** `PATCH /material-consumption-reports/:id` — `material_consumption.manage` */
export async function updateMaterialConsumptionReport(
  id: string,
  input: UpdateMaterialConsumptionReportInput,
): Promise<MaterialConsumptionReport> {
  const res = await apiPatch<MaterialConsumptionReport>(
    `/material-consumption-reports/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update material consumption report failed');
  }
  return normaliseReport(res.data);
}

/** `POST /material-consumption-reports/:id/submit` — `material_consumption.manage` */
export async function submitMaterialConsumptionReport(
  id: string,
): Promise<MaterialConsumptionReport> {
  const res = await apiPost<MaterialConsumptionReport>(
    `/material-consumption-reports/${id}/submit`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Submit material consumption report failed');
  }
  return normaliseReport(res.data);
}

/** `POST /material-consumption-reports/:id/approve` — `material_consumption.approve` */
export async function approveMaterialConsumptionReport(
  id: string,
  input: ApproveMaterialConsumptionReportInput = {},
): Promise<MaterialConsumptionReport> {
  const res = await apiPost<MaterialConsumptionReport>(
    `/material-consumption-reports/${id}/approve`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Approve material consumption report failed');
  }
  return normaliseReport(res.data);
}

/** `POST /material-consumption-reports/:id/cancel` — `material_consumption.manage` */
export async function cancelMaterialConsumptionReport(
  id: string,
): Promise<MaterialConsumptionReport> {
  const res = await apiPost<MaterialConsumptionReport>(
    `/material-consumption-reports/${id}/cancel`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Cancel material consumption report failed');
  }
  return normaliseReport(res.data);
}
