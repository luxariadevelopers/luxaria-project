import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';

function escapeCsvCell(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Build a CSV string from visible columns and rows (client-side export). */
export function rowsToCsv<R extends GridValidRowModel>(
  rows: R[],
  columns: GridColDef<R>[],
): string {
  const cols = columns.filter(
    (c) => c.field && c.field !== '__actions' && !c.field.startsWith('__'),
  );
  const header = cols.map((c) => escapeCsvCell(c.headerName ?? c.field)).join(',');
  const lines = rows.map((row) =>
    cols
      .map((c) => escapeCsvCell(row[c.field as keyof R] as unknown))
      .join(','),
  );
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
