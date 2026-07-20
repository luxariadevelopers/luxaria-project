import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { StatementColumnMapping } from './bank-reconciliation.constants';

export type ParsedStatementRow = {
  lineNumber: number;
  txnDate: Date;
  valueDate: Date | null;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  transactionId: string | null;
  chequeNumber: string | null;
  raw: Record<string, unknown>;
};

@Injectable()
export class BankStatementImportService {
  async parseBuffer(
    buffer: Buffer,
    fileName: string,
    mapping: StatementColumnMapping,
  ): Promise<ParsedStatementRow[]> {
    if (!mapping.date) {
      throw new BadRequestException('columnMapping.date is required');
    }
    if (!mapping.debit && !mapping.credit && !mapping.amount) {
      throw new BadRequestException(
        'columnMapping must include debit/credit and/or amount',
      );
    }

    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
      return this.parseCsv(buffer.toString('utf8'), mapping);
    }
    return this.parseExcel(buffer, mapping);
  }

  private async parseExcel(
    buffer: Buffer,
    mapping: StatementColumnMapping,
  ): Promise<ParsedStatementRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cell.text ?? cell.value ?? '').trim();
    });

    const rows: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const key = headers[col - 1];
        if (!key) return;
        obj[key] = cell.value;
      });
      if (Object.keys(obj).length) rows.push(obj);
    });

    return this.mapRows(rows, mapping);
  }

  private parseCsv(
    text: string,
    mapping: StatementColumnMapping,
  ): ParsedStatementRow[] {
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('CSV must include a header and at least one row');
    }

    const headers = this.splitCsvLine(lines[0]).map((h) => h.trim());
    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i]);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] ?? '';
      });
      rows.push(obj);
    }
    return this.mapRows(rows, mapping);
  }

  private mapRows(
    rows: Record<string, unknown>[],
    mapping: StatementColumnMapping,
  ): ParsedStatementRow[] {
    const resolved = this.resolveHeaders(rows[0] ?? {}, mapping);
    const out: ParsedStatementRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const dateRaw = this.cell(raw, resolved.date);
      const txnDate = this.parseDate(dateRaw);
      if (!txnDate) continue;

      let debit = 0;
      let credit = 0;
      if (resolved.amount) {
        const signed = this.parseNumber(this.cell(raw, resolved.amount));
        if (signed >= 0) credit = signed;
        else debit = Math.abs(signed);
      } else {
        debit = Math.abs(this.parseNumber(this.cell(raw, resolved.debit)));
        credit = Math.abs(this.parseNumber(this.cell(raw, resolved.credit)));
      }

      if (debit === 0 && credit === 0) continue;

      out.push({
        lineNumber: out.length + 1,
        txnDate,
        valueDate: null,
        description: String(
          this.cell(raw, resolved.description) ?? '',
        ).trim(),
        debit: this.round2(debit),
        credit: this.round2(credit),
        balance: resolved.balance
          ? this.parseNumber(this.cell(raw, resolved.balance))
          : null,
        transactionId: this.normalizeRef(
          this.cell(raw, resolved.transactionId),
        ),
        chequeNumber: this.normalizeRef(this.cell(raw, resolved.chequeNumber)),
        raw: Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, this.serializeCell(v)]),
        ),
      });
    }

    if (!out.length) {
      throw new BadRequestException(
        'No statement lines could be parsed with the given column mapping',
      );
    }
    return out;
  }

  private resolveHeaders(
    sample: Record<string, unknown>,
    mapping: StatementColumnMapping,
  ): Required<
    Pick<
      StatementColumnMapping,
      'date' | 'description' | 'debit' | 'credit' | 'amount' | 'balance' | 'transactionId' | 'chequeNumber'
    >
  > {
    const keys = Object.keys(sample);
    const find = (wanted?: string) => {
      if (!wanted) return '';
      const exact = keys.find((k) => k === wanted);
      if (exact) return exact;
      const ci = keys.find(
        (k) => k.toLowerCase().trim() === wanted.toLowerCase().trim(),
      );
      return ci ?? wanted;
    };

    return {
      date: find(mapping.date),
      description: find(mapping.description),
      debit: find(mapping.debit),
      credit: find(mapping.credit),
      amount: find(mapping.amount),
      balance: find(mapping.balance),
      transactionId: find(mapping.transactionId),
      chequeNumber: find(mapping.chequeNumber),
    };
  }

  private cell(row: Record<string, unknown>, key?: string): unknown {
    if (!key) return undefined;
    return row[key];
  }

  private parseDate(value: unknown): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'number') {
      // Excel serial date
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + value * 86400000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === 'object' && value && 'result' in (value as object)) {
      return this.parseDate((value as { result: unknown }).result);
    }
    const s = String(value).trim();
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]) - 1;
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      return new Date(Date.UTC(year, month, day));
    }
    return null;
  }

  private parseNumber(value: unknown): number {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value && 'result' in (value as object)) {
      return this.parseNumber((value as { result: unknown }).result);
    }
    const s = String(value)
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '')
      .trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizeRef(value: unknown): string | null {
    if (value == null || value === '') return null;
    const s = String(value).trim();
    return s.length ? s : null;
  }

  private serializeCell(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && value && 'result' in (value as object)) {
      return this.serializeCell((value as { result: unknown }).result);
    }
    if (typeof value === 'object' && value && 'text' in (value as object)) {
      return String((value as { text: string }).text);
    }
    return value;
  }

  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
