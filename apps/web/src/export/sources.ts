import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import {
  exportAccountingReportBinary,
  exportBoqProjectBinary,
  exportConstructionReportBinary,
  exportFinanceDashboardBinary,
  exportTableRowsCsv,
} from './api';
import type { ExportDescriptor, ExportFieldOption } from './types';

/** Accounting report Excel/PDF — `report.export`. */
export function accountingReportExportDescriptor(input: {
  reportType: string;
  title?: string;
  /** Backend requires projectId for project-cost-sheet, project-profit-and-loss, project-fund-flow. */
  requireProjectId?: boolean;
}): ExportDescriptor {
  const requireProject =
    input.requireProjectId ??
    [
      'project-cost-sheet',
      'project-profit-and-loss',
      'project-fund-flow',
    ].includes(input.reportType);

  return {
    id: `accounting:${input.reportType}`,
    title: input.title ?? `Export ${input.reportType}`,
    permission: 'report.export',
    allowedFormats: ['xlsx', 'pdf'],
    defaultFormat: 'xlsx',
    showDateRange: true,
    requiredFilters: requireProject
      ? [{ key: 'projectId', label: 'Project id' }]
      : undefined,
    optionalFilters: [
      { key: 'financialYearId', label: 'Financial year id' },
      { key: 'accountId', label: 'Account id' },
      { key: 'partyId', label: 'Party id' },
      ...(requireProject
        ? []
        : [{ key: 'projectId' as const, label: 'Project id' }]),
    ],
    fallbackFilename: `${input.reportType}.xlsx`,
    fetchBinary: (values) =>
      exportAccountingReportBinary(input.reportType, values),
  };
}

/** Construction report Excel/PDF — `report.export`. */
export function constructionReportExportDescriptor(input: {
  reportType: string;
  title?: string;
  requireProjectId?: boolean;
}): ExportDescriptor {
  return {
    id: `construction:${input.reportType}`,
    title: input.title ?? `Export ${input.reportType}`,
    permission: 'report.export',
    allowedFormats: ['xlsx', 'pdf'],
    defaultFormat: 'xlsx',
    showDateRange: true,
    requiredFilters: input.requireProjectId
      ? [{ key: 'projectId', label: 'Project id' }]
      : undefined,
    optionalFilters: [
      { key: 'projectId', label: 'Project id' },
      { key: 'contractorId', label: 'Contractor id' },
      { key: 'vendorId', label: 'Vendor id' },
      { key: 'materialId', label: 'Material id' },
    ],
    fallbackFilename: `${input.reportType}.xlsx`,
    fetchBinary: (values) =>
      exportConstructionReportBinary(input.reportType, values),
  };
}

/**
 * Finance dashboard CSV/Excel — `report.export`.
 * `horizonDays` capped at 180 (DTO `@Max(180)`).
 */
export function financeDashboardExportDescriptor(): ExportDescriptor {
  return {
    id: 'finance-dashboard',
    title: 'Export finance dashboard',
    permission: 'report.export',
    allowedFormats: ['xlsx', 'csv'],
    defaultFormat: 'xlsx',
    showDateRange: true,
    showAsOfDate: true,
    showHorizonDays: true,
    optionalFilters: [
      { key: 'projectId', label: 'Project id' },
      { key: 'financialYearId', label: 'Financial year id' },
    ],
    fallbackFilename: 'finance-dashboard.xlsx',
    fetchBinary: (values) => exportFinanceDashboardBinary(values),
  };
}

/** BOQ project Excel — `boq.view` (module export permission). */
export function boqProjectExportDescriptor(projectId: string): ExportDescriptor {
  return {
    id: `boq:${projectId}`,
    title: 'Export BOQ Excel',
    permission: 'boq.view',
    allowedFormats: ['xlsx'],
    defaultFormat: 'xlsx',
    requiredFilters: [{ key: 'projectId', label: 'Project id' }],
    fallbackFilename: `boq-${projectId}.xlsx`,
    fetchBinary: (values) =>
      exportBoqProjectBinary(values.projectId || projectId),
  };
}

/** Client-side DataTable CSV with column field selection. */
export function tableCsvExportDescriptor<R extends GridValidRowModel>(input: {
  title?: string;
  rows: R[];
  columns: GridColDef<R>[];
  /** Optional permission; omit for unrestricted client CSV. */
  permission?: ExportDescriptor['permission'];
  fileName: string;
}): ExportDescriptor {
  const fields: ExportFieldOption[] = input.columns
    .filter(
      (c) =>
        Boolean(c.field) &&
        c.field !== '__actions' &&
        !String(c.field).startsWith('__'),
    )
    .map((c) => ({
      id: String(c.field),
      label: String(c.headerName ?? c.field),
      defaultSelected: true,
    }));

  return {
    id: `table-csv:${input.fileName}`,
    title: input.title ?? 'Export CSV',
    permission: input.permission,
    allowedFormats: ['csv'],
    defaultFormat: 'csv',
    fields,
    requireFieldSelection: true,
    fallbackFilename: input.fileName.endsWith('.csv')
      ? input.fileName
      : `${input.fileName}.csv`,
    fetchBinary: async (values) =>
      exportTableRowsCsv({
        rows: input.rows,
        columns: input.columns,
        selectedFieldIds: values.selectedFieldIds,
        fallbackFilename: input.fileName,
      }),
  };
}
