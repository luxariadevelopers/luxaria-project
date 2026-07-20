import { DEFAULT_TIMEZONE } from './date';
import { EMPTY_DISPLAY, type EmptyDisplayOptions } from './nullish';

/**
 * Default FY start month = April, matching `company.financialYearStartMonth`
 * seed/default in the Nest company module.
 */
export const DEFAULT_FINANCIAL_YEAR_START_MONTH = 4;

export type FinancialYearParts = {
  /** Calendar year in which the FY starts (e.g. 2026 for FY 2026-27). */
  startYear: number;
  /** Inclusive start date (UTC midnight of local FY start day in `timeZone`). */
  startDate: Date;
  /** Inclusive end date (last moment conceptually — date at FY end day). */
  endDate: Date;
  /** Display label e.g. `FY 2026-27`. */
  label: string;
  /** Short code e.g. `2026-27`. */
  code: string;
};

export type FinancialYearOptions = EmptyDisplayOptions & {
  /**
   * 1–12 month when FY starts.
   * Default 4 (April) — same as company.financialYearStartMonth.
   */
  startMonth?: number;
  timeZone?: string;
};

function zonedYmd(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
}

/**
 * Resolve Indian financial-year parts for a date.
 * April start: 1 Apr 2026 – 31 Mar 2027 → FY 2026-27.
 */
export function getFinancialYear(
  value: Date | string | number | null | undefined,
  options: FinancialYearOptions = {},
): FinancialYearParts | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const startMonth = options.startMonth ?? DEFAULT_FINANCIAL_YEAR_START_MONTH;
  if (startMonth < 1 || startMonth > 12) {
    return null;
  }

  const timeZone = options.timeZone ?? DEFAULT_TIMEZONE;
  const { year, month } = zonedYmd(date, timeZone);
  const startYear = month >= startMonth ? year : year - 1;
  const endYear = startYear + 1;

  // Construct FY bounds as UTC dates representing calendar days in IST context.
  // Display helpers use these for labels; posting windows remain server-owned.
  const startDate = new Date(Date.UTC(startYear, startMonth - 1, 1));
  // End = day before next FY start
  const endDate = new Date(Date.UTC(endYear, startMonth - 1, 0));

  const endShort = String(endYear).slice(-2);
  const code = `${startYear}-${endShort}`;
  const label = `FY ${code}`;

  return { startYear, startDate, endDate, label, code };
}

/**
 * Format FY label for a date: `FY 2026-27`. Null/invalid → `—`.
 */
export function formatFinancialYear(
  value: Date | string | number | null | undefined,
  options: FinancialYearOptions = {},
): string {
  const fy = getFinancialYear(value, options);
  if (!fy) {
    return options.empty ?? EMPTY_DISPLAY;
  }
  return fy.label;
}

/**
 * Build FY label from an explicit start year: `formatFinancialYearFromStart(2026)` → `FY 2026-27`.
 */
export function formatFinancialYearFromStart(startYear: number): string {
  if (!Number.isFinite(startYear) || startYear < 1) {
    return EMPTY_DISPLAY;
  }
  const y = Math.trunc(startYear);
  return `FY ${y}-${String(y + 1).slice(-2)}`;
}
