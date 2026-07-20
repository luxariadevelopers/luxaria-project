import ExcelJS from 'exceljs';
import type { BoqImportRowPreview } from './validateImport';

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: string }).text).trim();
  }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return String((value as { result: unknown }).result ?? '').trim();
  }
  return String(value).trim();
}

function cellToNumber(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'result' in value) {
    const result = (value as { result: unknown }).result;
    const n = Number(result);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Client-side parse of Nest BOQ Excel template / export shape.
 * Used for validate + preview steps before `POST …/import` commit.
 */
export async function parseBoqWorkbook(file: File): Promise<{
  headers: string[];
  rows: BoqImportRowPreview[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new Error('Invalid Excel file');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Excel workbook has no worksheets');
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  const headerMap = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const key = cellToString(cell.value);
    if (!key) return;
    headers.push(key);
    headerMap.set(key.replace(/\s+/g, '').toLowerCase(), col);
  });

  const rows: BoqImportRowPreview[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (name: string): unknown => {
      const col = headerMap.get(name.toLowerCase());
      if (!col) return undefined;
      return row.getCell(col).value;
    };

    const description = cellToString(get('description'));
    if (!description) return;

    const plannedValueRaw = get('plannedvalue');
    rows.push({
      rowNumber,
      blockCode: cellToString(get('blockcode')).toUpperCase(),
      floorCode: cellToString(get('floorcode')).toUpperCase(),
      categoryCode: cellToString(get('categorycode')).toUpperCase(),
      boqCode: cellToString(get('boqcode')).toUpperCase(),
      description,
      unit: cellToString(get('unit')),
      plannedQuantity: cellToNumber(get('plannedquantity'), 0),
      plannedValue:
        plannedValueRaw === undefined ||
        plannedValueRaw === null ||
        plannedValueRaw === ''
          ? null
          : cellToNumber(plannedValueRaw, 0),
    });
  });

  return { headers, rows };
}
