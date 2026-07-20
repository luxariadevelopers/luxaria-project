import {
  BOQ_REQUIRED_EXCEL_COLUMNS,
  type BoqRequiredExcelColumn,
} from './constants';

export type BoqImportRowPreview = {
  rowNumber: number;
  blockCode: string;
  floorCode: string;
  categoryCode: string;
  boqCode: string;
  description: string;
  unit: string;
  plannedQuantity: number;
  plannedValue: number | null;
};

export type BoqImportIssue = {
  severity: 'blocking' | 'warning';
  code: 'missing_column' | 'duplicate_code' | 'empty_file' | 'row';
  message: string;
  rowNumber?: number;
  column?: string;
  boqCode?: string;
};

export type BoqImportValidationResult = {
  headers: string[];
  rows: BoqImportRowPreview[];
  issues: BoqImportIssue[];
  blockingCount: number;
  canCommit: boolean;
  summary: {
    rowCount: number;
    uniqueBoqCodes: number;
    plannedValueSum: number;
  };
};

function normaliseHeader(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Validate workbook headers + row previews before Nest commit.
 * Mirrors Nest required columns and unique `boqCode` within the file.
 */
export function validateBoqImport(input: {
  headers: readonly string[];
  rows: readonly BoqImportRowPreview[];
}): BoqImportValidationResult {
  const issues: BoqImportIssue[] = [];
  const headerKeys = new Set(
    input.headers.map(normaliseHeader).filter(Boolean),
  );

  for (const required of BOQ_REQUIRED_EXCEL_COLUMNS) {
    if (!headerKeys.has(required.toLowerCase())) {
      issues.push({
        severity: 'blocking',
        code: 'missing_column',
        column: required,
        message: `Excel is missing required column: ${required.toLowerCase()}`,
      });
    }
  }

  if (input.rows.length === 0) {
    issues.push({
      severity: 'blocking',
      code: 'empty_file',
      message: 'Excel contains no BOQ item rows',
    });
  }

  const codeToRows = new Map<string, number[]>();
  for (const row of input.rows) {
    const code = row.boqCode.trim().toUpperCase();
    if (!code) continue;
    const list = codeToRows.get(code) ?? [];
    list.push(row.rowNumber);
    codeToRows.set(code, list);
  }

  for (const [boqCode, rowNumbers] of codeToRows) {
    if (rowNumbers.length < 2) continue;
    for (const rowNumber of rowNumbers) {
      issues.push({
        severity: 'blocking',
        code: 'duplicate_code',
        rowNumber,
        boqCode,
        message: `Duplicate boqCode "${boqCode}" in import file (rows ${rowNumbers.join(', ')})`,
      });
    }
  }

  for (const row of input.rows) {
    if (!row.description.trim()) {
      issues.push({
        severity: 'blocking',
        code: 'row',
        rowNumber: row.rowNumber,
        message: 'Description is required',
      });
    }
  }

  const blockingCount = issues.filter((i) => i.severity === 'blocking').length;
  const plannedValueSum = input.rows.reduce(
    (sum, row) => sum + (row.plannedValue ?? 0),
    0,
  );

  return {
    headers: [...input.headers],
    rows: [...input.rows],
    issues,
    blockingCount,
    canCommit: blockingCount === 0,
    summary: {
      rowCount: input.rows.length,
      uniqueBoqCodes: codeToRows.size,
      plannedValueSum,
    },
  };
}

export function missingRequiredColumns(
  headers: readonly string[],
): BoqRequiredExcelColumn[] {
  const headerKeys = new Set(headers.map(normaliseHeader).filter(Boolean));
  return BOQ_REQUIRED_EXCEL_COLUMNS.filter(
    (col) => !headerKeys.has(col.toLowerCase()),
  );
}
