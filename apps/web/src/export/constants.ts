/**
 * From `FinanceDashboardExportQueryDto.horizonDays` `@Max(180)`.
 * Do not invent other range caps — report exports only enforce `from <= to`.
 */
export const FINANCE_DASHBOARD_MAX_HORIZON_DAYS = 180;

export const FINANCE_DASHBOARD_DEFAULT_HORIZON_DAYS = 30;

/** MIME types returned by Nest export controllers. */
export const EXPORT_MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  pdf: 'application/pdf',
} as const;

export type ExportMimeKey = keyof typeof EXPORT_MIME;
