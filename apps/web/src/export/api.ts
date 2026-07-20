import { rowsToCsv } from '@/components/data-table/exportCsv';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { EXPORT_MIME } from './constants';
import { fetchExportBinary } from './fetchExportBinary';
import type { ExportFormValues, ExportFormat } from './types';

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function commonParams(values: ExportFormValues) {
  return {
    from: values.from || undefined,
    to: values.to || undefined,
    projectId: values.projectId || undefined,
    financialYearId: values.financialYearId || undefined,
    accountId: values.accountId || undefined,
    partyId: values.partyId || undefined,
    contractorId: values.contractorId || undefined,
    vendorId: values.vendorId || undefined,
    materialId: values.materialId || undefined,
    date: values.date || undefined,
    horizonDays: values.horizonDays
      ? Number(values.horizonDays)
      : undefined,
  };
}

/** `GET /accounting-reports/:reportType/export` — `report.export` */
export function exportAccountingReportBinary(
  reportType: string,
  values: ExportFormValues,
) {
  const format: ExportFormat =
    values.format === 'csv' ? 'xlsx' : values.format;
  return fetchExportBinary({
    url: `/accounting-reports/${reportType}/export`,
    params: { ...commonParams(values), format },
    format,
    fallbackFilename: `${reportType}-${stamp()}.${format}`,
  });
}

/** `GET /construction-reports/:reportType/export` — `report.export` */
export function exportConstructionReportBinary(
  reportType: string,
  values: ExportFormValues,
) {
  const format: ExportFormat =
    values.format === 'csv' ? 'xlsx' : values.format;
  return fetchExportBinary({
    url: `/construction-reports/${reportType}/export`,
    params: {
      from: values.from || undefined,
      to: values.to || undefined,
      projectId: values.projectId || undefined,
      contractorId: values.contractorId || undefined,
      vendorId: values.vendorId || undefined,
      materialId: values.materialId || undefined,
      format,
    },
    format,
    fallbackFilename: `${reportType}-${stamp()}.${format}`,
  });
}

/** `GET /finance-dashboard/export` — `report.export` (csv | xlsx) */
export function exportFinanceDashboardBinary(values: ExportFormValues) {
  const format: ExportFormat =
    values.format === 'pdf' ? 'xlsx' : values.format;
  return fetchExportBinary({
    url: '/finance-dashboard/export',
    params: {
      date: values.date || undefined,
      from: values.from || undefined,
      to: values.to || undefined,
      projectId: values.projectId || undefined,
      financialYearId: values.financialYearId || undefined,
      horizonDays: values.horizonDays
        ? Number(values.horizonDays)
        : undefined,
      format,
    },
    format,
    fallbackFilename: `finance-dashboard-${stamp()}.${format}`,
  });
}

/** `GET /boq/projects/:projectId/export` — `boq.view` (xlsx) */
export function exportBoqProjectBinary(projectId: string) {
  return fetchExportBinary({
    url: `/boq/projects/${projectId}/export`,
    format: 'xlsx',
    fallbackFilename: `boq-${projectId}-${stamp()}.xlsx`,
  });
}

/** Client-side table CSV (no Nest export route). */
export function exportTableRowsCsv<R extends GridValidRowModel>(input: {
  rows: R[];
  columns: GridColDef<R>[];
  selectedFieldIds: string[];
  fallbackFilename: string;
}): { blob: Blob; filename: string; contentType: string } {
  const cols = input.columns.filter((c) =>
    input.selectedFieldIds.includes(String(c.field)),
  );
  const csv = rowsToCsv(input.rows, cols);
  const filename = input.fallbackFilename.endsWith('.csv')
    ? input.fallbackFilename
    : `${input.fallbackFilename}.csv`;
  const blob = new Blob([csv], { type: EXPORT_MIME.csv });
  return { blob, filename, contentType: EXPORT_MIME.csv };
}
