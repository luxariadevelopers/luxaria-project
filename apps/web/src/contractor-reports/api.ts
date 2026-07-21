import { apiGet } from '@/api/client';

export type CtrReportRows<T = Record<string, unknown>> = {
  projectId?: string | null;
  companyId?: string | null;
  available?: boolean;
  source?: string | null;
  rows: T[];
};

async function fetchReport<T>(
  path: string,
  query: { projectId?: string; companyId?: string } = {},
): Promise<CtrReportRows<T>> {
  const res = await apiGet<CtrReportRows<T>>(path, query);
  if (!res.data) {
    throw new Error(res.message || 'Report unavailable');
  }
  return res.data;
}

export function fetchContractorRegisterReport(projectId?: string) {
  return fetchReport('/contractor/reports/contractors', { projectId });
}

export function fetchWorkOrderSummaryReport(projectId?: string) {
  return fetchReport('/contractor/reports/work-orders', { projectId });
}

export function fetchRaRegisterReport(projectId?: string) {
  return fetchReport('/contractor/reports/ra-register', { projectId });
}

export function fetchRetentionRegisterReport(projectId?: string) {
  return fetchReport('/contractor/reports/retention', { projectId });
}

export function fetchRecoveriesRegisterReport(projectId?: string) {
  return fetchReport('/contractor/reports/recoveries', { projectId });
}

export function fetchContractorStatusRegisterReport() {
  return fetchReport('/contractor/reports/status');
}

export const CTR_REPORT_OPTIONS = [
  {
    id: 'contractors',
    label: 'Contractor Register',
    fetch: (projectId?: string) => fetchContractorRegisterReport(projectId),
  },
  {
    id: 'work-orders',
    label: 'Work Order Summary',
    fetch: (projectId?: string) => fetchWorkOrderSummaryReport(projectId),
  },
  {
    id: 'ra-register',
    label: 'RA Register',
    fetch: (projectId?: string) => fetchRaRegisterReport(projectId),
  },
  {
    id: 'retention',
    label: 'Retention',
    fetch: (projectId?: string) => fetchRetentionRegisterReport(projectId),
  },
  {
    id: 'recoveries',
    label: 'Recoveries',
    fetch: (projectId?: string) => fetchRecoveriesRegisterReport(projectId),
  },
  {
    id: 'status',
    label: 'Suspended / Blacklisted',
    fetch: () => fetchContractorStatusRegisterReport(),
  },
] as const;
