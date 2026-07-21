import { apiGet } from '@/api/client';

export type SeReportRows<T = Record<string, unknown>> = {
  projectId: string;
  available?: boolean;
  source?: string;
  rows: T[];
};

async function fetchReport<T>(
  path: string,
  projectId: string,
): Promise<SeReportRows<T>> {
  const res = await apiGet<SeReportRows<T>>(path, { projectId });
  if (!res.data) {
    throw new Error(res.message || 'Report unavailable');
  }
  return res.data;
}

export function fetchDprRegisterReport(projectId: string) {
  return fetchReport('/site-execution/reports/dpr-register', projectId);
}

export function fetchLabourReport(projectId: string) {
  return fetchReport('/site-execution/reports/labour', projectId);
}

export function fetchEquipmentUtilizationReport(projectId: string) {
  return fetchReport(
    '/site-execution/reports/equipment-utilization',
    projectId,
  );
}

export function fetchMaterialConsumptionReport(projectId: string) {
  return fetchReport(
    '/site-execution/reports/material-consumption',
    projectId,
  );
}

export function fetchDailyProgressReport(projectId: string) {
  return fetchReport('/site-execution/reports/daily-progress', projectId);
}

export function fetchDelayReport(projectId: string) {
  return fetchReport('/site-execution/reports/delay', projectId);
}

export function fetchQualityReport(projectId: string) {
  return fetchReport('/site-execution/reports/quality', projectId);
}

export function fetchSafetyReport(projectId: string) {
  return fetchReport('/site-execution/reports/safety', projectId);
}

export function fetchProductivityReport(projectId: string) {
  return fetchReport('/site-execution/reports/productivity', projectId);
}

export const SE_REPORT_OPTIONS = [
  { id: 'dpr-register', label: 'DPR Register', fetch: fetchDprRegisterReport },
  { id: 'labour', label: 'Labour', fetch: fetchLabourReport },
  {
    id: 'equipment-utilization',
    label: 'Equipment Utilization',
    fetch: fetchEquipmentUtilizationReport,
  },
  {
    id: 'material-consumption',
    label: 'Material Consumption',
    fetch: fetchMaterialConsumptionReport,
  },
  {
    id: 'daily-progress',
    label: 'Daily Progress',
    fetch: fetchDailyProgressReport,
  },
  { id: 'delay', label: 'Delay', fetch: fetchDelayReport },
  { id: 'quality', label: 'Quality', fetch: fetchQualityReport },
  { id: 'safety', label: 'Safety', fetch: fetchSafetyReport },
  {
    id: 'productivity',
    label: 'Productivity',
    fetch: fetchProductivityReport,
  },
] as const;
