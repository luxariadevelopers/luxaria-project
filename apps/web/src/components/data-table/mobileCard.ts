import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import type { DataTableMobileCardConfig } from './types';

const STATUS_FIELD_RE = /status/i;

export type ResolvedMobileCardFields = {
  primaryField: string;
  metaFields: string[];
  statusField?: string;
};

function visibleColumnFields<R extends GridValidRowModel>(
  columns: readonly GridColDef<R>[],
  columnVisibility?: Record<string, boolean>,
): string[] {
  return columns
    .map((c) => c.field)
    .filter((field): field is string => Boolean(field) && field !== '__actions')
    .filter((field) => columnVisibility?.[field] !== false);
}

/**
 * Resolve which columns drive the narrow-viewport card row.
 * Explicit `mobileCard` fields win; otherwise first column = primary,
 * next two non-status = meta, and a `*status*` field becomes the chip.
 */
export function resolveMobileCardFields<R extends GridValidRowModel>(
  columns: readonly GridColDef<R>[],
  config?: DataTableMobileCardConfig,
  columnVisibility?: Record<string, boolean>,
): ResolvedMobileCardFields | null {
  if (config?.disabled) return null;

  const fields = visibleColumnFields(columns, columnVisibility);
  if (fields.length === 0) return null;

  const statusField =
    config?.statusField && fields.includes(config.statusField)
      ? config.statusField
      : fields.find((f) => STATUS_FIELD_RE.test(f));

  const primaryField =
    config?.primaryField && fields.includes(config.primaryField)
      ? config.primaryField
      : (fields.find((f) => f !== statusField) ?? fields[0]!);

  const metaFromConfig = (config?.metaFields ?? []).filter(
    (f) => f !== primaryField && f !== statusField && fields.includes(f),
  );

  const metaFields =
    metaFromConfig.length > 0
      ? metaFromConfig.slice(0, 2)
      : fields
          .filter((f) => f !== primaryField && f !== statusField)
          .slice(0, 2);

  return { primaryField, metaFields, statusField };
}

function callValueGetter<R extends GridValidRowModel>(
  col: GridColDef<R>,
  row: R,
): unknown {
  const raw = (row as Record<string, unknown>)[col.field];
  const getter = col.valueGetter;
  if (!getter) return raw;
  // MUI X v7+: (value, row, column, apiRef) => …
  try {
    return (
      getter as unknown as (
        value: unknown,
        row: R,
        column: GridColDef<R>,
        apiRef: null,
      ) => unknown
    )(raw, row, col, null);
  } catch {
    return raw;
  }
}

function callValueFormatter<R extends GridValidRowModel>(
  col: GridColDef<R>,
  value: unknown,
  row: R,
): unknown {
  const formatter = col.valueFormatter;
  if (!formatter) return value;
  try {
    return (
      formatter as unknown as (
        value: unknown,
        row: R,
        column: GridColDef<R>,
        apiRef: null,
      ) => unknown
    )(value, row, col, null);
  } catch {
    return value;
  }
}

/** Plain text for a cell — prefers valueGetter / valueFormatter over raw field. */
export function getMobileCellText<R extends GridValidRowModel>(
  columns: readonly GridColDef<R>[],
  field: string,
  row: R,
): string {
  const col = columns.find((c) => c.field === field);
  if (!col) {
    const raw = (row as Record<string, unknown>)[field];
    return formatDisplay(raw);
  }
  const gotten = callValueGetter(col, row);
  const formatted = callValueFormatter(col, gotten, row);
  return formatDisplay(formatted);
}

export function getMobileColumnLabel<R extends GridValidRowModel>(
  columns: readonly GridColDef<R>[],
  field: string,
): string {
  const col = columns.find((c) => c.field === field);
  if (!col) return field;
  if (typeof col.headerName === 'string' && col.headerName.trim()) {
    return col.headerName;
  }
  return field;
}

function formatDisplay(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value.trim() || '—';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') {
    // Avoid dumping React nodes / objects into cards.
    return '—';
  }
  return String(value);
}
