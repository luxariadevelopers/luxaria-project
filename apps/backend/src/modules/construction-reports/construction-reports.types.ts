import type { ConstructionReportType } from './construction-reports.constants';

export type DrillDownLink = {
  label: string;
  href: string;
};

export type ReportFiltersApplied = {
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  from: string | null;
  to: string | null;
  contractorId: string | null;
  vendorId: string | null;
  materialId: string | null;
};

export type ReportMeta = {
  reportType: ConstructionReportType;
  title: string;
  filters: ReportFiltersApplied;
  generatedAt: string;
};

export type ConstructionReportPayload = {
  meta: ReportMeta;
  totals?: Record<string, number>;
  rows?: unknown[];
  sections?: unknown;
  [key: string]: unknown;
};
