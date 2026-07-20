import type { StatementColumnMapping } from './types';
import { validateColumnMapping } from './validation';

export type ParsedPreviewRow = {
  lineNumber: number;
  txnDate: string;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  transactionId: string | null;
  chequeNumber: string | null;
};

export type CsvPreviewResult = {
  headers: string[];
  rows: ParsedPreviewRow[];
  skippedRows: number;
};

/** Split a CSV line respecting quoted fields (Nest-aligned). */
export function splitCsvLine(line: string): string[] {
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
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

export function parseDateValue(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  // Prefer dd/mm(/yyyy) before `Date` parse — JS treats slash dates as mm/dd.
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const utc = new Date(Date.UTC(year, month, day));
    if (
      utc.getUTCFullYear() === year &&
      utc.getUTCMonth() === month &&
      utc.getUTCDate() === day
    ) {
      return utc;
    }
    return null;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseAmountValue(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  const s = String(value)
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalizeRef(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/**
 * Client CSV preview used by the import wizard.
 * XLS/XLSX mapping is validated client-side; parsing is done by Nest.
 */
export function previewCsvStatement(
  text: string,
  mapping: StatementColumnMapping,
): CsvPreviewResult {
  const validated = validateColumnMapping(mapping);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must include a header and at least one row');
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const missing = [validated.mapping.date]
    .concat(
      validated.mapping.amount
        ? [validated.mapping.amount]
        : [validated.mapping.debit, validated.mapping.credit].filter(
            (v): v is string => Boolean(v),
          ),
    )
    .filter(
      (wanted) =>
        !headers.some(
          (h) => h.toLowerCase().trim() === wanted.toLowerCase().trim(),
        ),
    );
  if (missing.length) {
    throw new Error(
      `Missing mapped columns in file header: ${missing.join(', ')}`,
    );
  }

  const find = (wanted?: string) => {
    if (!wanted) return '';
    const exact = headers.find((k) => k === wanted);
    if (exact) return exact;
    return (
      headers.find(
        (k) => k.toLowerCase().trim() === wanted.toLowerCase().trim(),
      ) ?? wanted
    );
  };

  const resolved = {
    date: find(validated.mapping.date),
    description: find(validated.mapping.description),
    debit: find(validated.mapping.debit),
    credit: find(validated.mapping.credit),
    amount: find(validated.mapping.amount),
    balance: find(validated.mapping.balance),
    transactionId: find(validated.mapping.transactionId),
    chequeNumber: find(validated.mapping.chequeNumber),
  };

  const rows: ParsedPreviewRow[] = [];
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h] = cols[idx] ?? '';
    });

    const txnDate = parseDateValue(raw[resolved.date]);
    if (!txnDate) {
      skippedRows += 1;
      continue;
    }

    let debit = 0;
    let credit = 0;
    if (resolved.amount) {
      const signed = parseAmountValue(raw[resolved.amount]);
      if (signed >= 0) credit = signed;
      else debit = Math.abs(signed);
    } else {
      debit = Math.abs(parseAmountValue(raw[resolved.debit]));
      credit = Math.abs(parseAmountValue(raw[resolved.credit]));
    }

    if (debit === 0 && credit === 0) {
      skippedRows += 1;
      continue;
    }

    rows.push({
      lineNumber: rows.length + 1,
      txnDate: txnDate.toISOString(),
      description: String(raw[resolved.description] ?? '').trim(),
      debit: round2(debit),
      credit: round2(credit),
      balance: resolved.balance
        ? parseAmountValue(raw[resolved.balance])
        : null,
      transactionId: normalizeRef(raw[resolved.transactionId]),
      chequeNumber: normalizeRef(raw[resolved.chequeNumber]),
    });
  }

  if (!rows.length) {
    throw new Error(
      'No statement lines could be parsed with the given column mapping',
    );
  }

  return { headers, rows, skippedRows };
}

/** Suggest mapping from common Indian bank CSV headers. */
export function suggestColumnMapping(
  headers: string[],
): Partial<StatementColumnMapping> {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const pick = (...candidates: string[]) => {
    for (const c of candidates) {
      const idx = lower.findIndex((h) => h === c || h.includes(c));
      if (idx >= 0) return headers[idx];
    }
    return undefined;
  };
  return {
    date: pick('txn date', 'transaction date', 'value date', 'date'),
    description: pick('narration', 'description', 'particulars', 'remarks'),
    debit: pick('withdrawal', 'debit', 'withdrawals'),
    credit: pick('deposit', 'credit', 'deposits'),
    amount: pick('amount'),
    balance: pick('balance', 'closing balance'),
    transactionId: pick('utr', 'ref no', 'transaction id', 'chq/ref'),
    chequeNumber: pick('cheque', 'chq no', 'cheque number'),
  };
}

export function readCsvHeaders(text: string): string[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  return splitCsvLine(lines[0]).map((h) => h.trim()).filter(Boolean);
}
