import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  parseBoqUnit,
  roundMoney,
  roundQty,
} from './boq.validation';
import { BoqItemStatus, BoqUnit } from './schemas/boq.schema';

export const BOQ_EXCEL_HEADERS = [
  'blockCode',
  'blockName',
  'floorCode',
  'floorName',
  'floorLevel',
  'categoryCode',
  'categoryName',
  'boqCode',
  'description',
  'unit',
  'plannedQuantity',
  'materialCost',
  'labourCost',
  'subcontractCost',
  'otherCost',
  'plannedRate',
  'plannedValue',
  'startDate',
  'endDate',
  'materialCoefficients',
  'status',
] as const;

export type BoqExcelRow = {
  blockCode: string;
  blockName: string;
  floorCode: string;
  floorName: string;
  floorLevel: number;
  categoryCode: string;
  categoryName: string;
  boqCode: string | null;
  description: string;
  unit: BoqUnit;
  plannedQuantity: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedRate: number | null;
  plannedValue: number | null;
  startDate: string | null;
  endDate: string | null;
  materialCoefficients: Array<{
    materialCode?: string | null;
    description?: string | null;
    coefficient: number;
    unit?: BoqUnit | null;
  }>;
  status: BoqItemStatus;
  rowNumber: number;
};

export type BoqExcelExportRow = {
  blockCode: string;
  blockName: string;
  floorCode: string;
  floorName: string;
  floorLevel: number;
  categoryCode: string;
  categoryName: string;
  boqCode: string;
  description: string;
  unit: BoqUnit;
  plannedQuantity: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedRate: number;
  plannedValue: number;
  startDate: string | null;
  endDate: string | null;
  materialCoefficients: string;
  status: BoqItemStatus;
};

@Injectable()
export class BoqExcelService {
  async parseImportBuffer(buffer: Buffer): Promise<BoqExcelRow[]> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException('Invalid Excel file');
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel workbook has no worksheets');
    }

    const headerRow = sheet.getRow(1);
    const headerMap = new Map<string, number>();
    headerRow.eachCell((cell, col) => {
      const key = String(cell.value ?? '')
        .trim()
        .replace(/\s+/g, '');
      if (key) headerMap.set(key.toLowerCase(), col);
    });

    for (const required of [
      'blockcode',
      'floorcode',
      'categorycode',
      'description',
      'unit',
      'plannedquantity',
    ]) {
      if (!headerMap.has(required)) {
        throw new BadRequestException(
          `Excel is missing required column: ${required}`,
        );
      }
    }

    const rows: BoqExcelRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const get = (name: string): unknown => {
        const col = headerMap.get(name.toLowerCase());
        if (!col) return undefined;
        const cell = row.getCell(col);
        return cell.value;
      };

      const description = cellToString(get('description'));
      if (!description) return;

      const materialCost = cellToNumber(get('materialcost'), 0);
      const labourCost = cellToNumber(get('labourcost'), 0);
      const subcontractCost = cellToNumber(get('subcontractcost'), 0);
      const otherCost = cellToNumber(get('othercost'), 0);
      const plannedQuantity = cellToNumber(get('plannedquantity'), 0);
      const plannedRateRaw = get('plannedrate');
      const plannedValueRaw = get('plannedvalue');
      const statusRaw = cellToString(get('status')) || BoqItemStatus.Draft;

      rows.push({
        blockCode: cellToString(get('blockcode')).toUpperCase(),
        blockName:
          cellToString(get('blockname')) ||
          cellToString(get('blockcode')).toUpperCase(),
        floorCode: cellToString(get('floorcode')).toUpperCase(),
        floorName:
          cellToString(get('floorname')) ||
          cellToString(get('floorcode')).toUpperCase(),
        floorLevel: cellToNumber(get('floorlevel'), 0),
        categoryCode: cellToString(get('categorycode')).toUpperCase(),
        categoryName:
          cellToString(get('categoryname')) ||
          cellToString(get('categorycode')).toUpperCase(),
        boqCode: cellToString(get('boqcode'))?.toUpperCase() || null,
        description,
        unit: parseBoqUnit(cellToString(get('unit'))),
        plannedQuantity: roundQty(plannedQuantity),
        materialCost: roundMoney(materialCost),
        labourCost: roundMoney(labourCost),
        subcontractCost: roundMoney(subcontractCost),
        otherCost: roundMoney(otherCost),
        plannedRate:
          plannedRateRaw === undefined || plannedRateRaw === null || plannedRateRaw === ''
            ? null
            : roundMoney(cellToNumber(plannedRateRaw, 0)),
        plannedValue:
          plannedValueRaw === undefined ||
          plannedValueRaw === null ||
          plannedValueRaw === ''
            ? null
            : roundMoney(cellToNumber(plannedValueRaw, 0)),
        startDate: cellToDateString(get('startdate')),
        endDate: cellToDateString(get('enddate')),
        materialCoefficients: parseCoefficients(
          cellToString(get('materialcoefficients')),
        ),
        status: parseStatus(statusRaw),
        rowNumber,
      });
    });

    if (!rows.length) {
      throw new BadRequestException('Excel contains no BOQ item rows');
    }
    return rows;
  }

  async buildExportBuffer(rows: BoqExcelExportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('BOQ');
    sheet.addRow([...BOQ_EXCEL_HEADERS]);
    for (const row of rows) {
      sheet.addRow([
        row.blockCode,
        row.blockName,
        row.floorCode,
        row.floorName,
        row.floorLevel,
        row.categoryCode,
        row.categoryName,
        row.boqCode,
        row.description,
        row.unit,
        row.plannedQuantity,
        row.materialCost,
        row.labourCost,
        row.subcontractCost,
        row.otherCost,
        row.plannedRate,
        row.plannedValue,
        row.startDate,
        row.endDate,
        row.materialCoefficients,
        row.status,
      ]);
    }
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => {
      col.width = 16;
    });
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async buildTemplateBuffer(): Promise<Buffer> {
    return this.buildExportBuffer([
      {
        blockCode: 'BLK-A',
        blockName: 'Block A',
        floorCode: 'FL-GF',
        floorName: 'Ground Floor',
        floorLevel: 0,
        categoryCode: 'WC-CIVIL',
        categoryName: 'Civil Works',
        boqCode: 'BOQ-SAMPLE-001',
        description: 'RCC columns M25',
        unit: BoqUnit.CubicMetre,
        plannedQuantity: 120,
        materialCost: 4500,
        labourCost: 1200,
        subcontractCost: 800,
        otherCost: 200,
        plannedRate: 6700,
        plannedValue: 804000,
        startDate: '2026-08-01',
        endDate: '2026-10-31',
        materialCoefficients: JSON.stringify([
          { materialCode: 'MAT-CEM', coefficient: 7.5, unit: 'bag' },
        ]),
        status: BoqItemStatus.Draft,
      },
    ]);
  }
}

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

function cellToDateString(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const asString = cellToString(value);
  if (!asString) return null;
  const parsed = new Date(asString);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date value: ${asString}`);
  }
  return parsed.toISOString().slice(0, 10);
}

function parseStatus(value: string): BoqItemStatus {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  const allowed = Object.values(BoqItemStatus) as string[];
  if (!allowed.includes(normalized)) {
    throw new BadRequestException(`Invalid BOQ status: ${value}`);
  }
  return normalized as BoqItemStatus;
}

function parseCoefficients(raw: string): BoqExcelRow['materialCoefficients'] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('not array');
    }
    return parsed.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        materialCode: row.materialCode
          ? String(row.materialCode).toUpperCase()
          : null,
        description: row.description ? String(row.description) : null,
        coefficient: Number(row.coefficient ?? 0),
        unit: row.unit ? parseBoqUnit(String(row.unit)) : null,
      };
    });
  } catch {
    throw new BadRequestException(
      'materialCoefficients must be a JSON array string',
    );
  }
}
