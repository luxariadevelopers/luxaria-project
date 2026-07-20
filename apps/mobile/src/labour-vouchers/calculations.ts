import type { LabourVoucherAmounts } from './types';

/** Matches Nest `MONEY_EPS` for amount reconciliation. */
export const MONEY_EPS = 0.005;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseNonNegativeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Gross = attendance/quantity × rate (UI-derived; Nest stores grossAmount).
 */
export function computeGrossAmount(quantity: number, rate: number): number {
  return roundMoney(quantity * rate);
}

/**
 * Net = gross − deductions (matches Nest assertAmounts rounding).
 */
export function computeNetAmount(grossAmount: number, deductions: number): number {
  return roundMoney(grossAmount - deductions);
}

export function amountsReconcile(
  grossAmount: number,
  deductions: number,
  netAmount: number,
): boolean {
  const expected = computeNetAmount(grossAmount, deductions);
  return Math.abs(expected - netAmount) <= MONEY_EPS;
}

export function deriveLabourAmounts(input: {
  attendanceQuantity: string;
  rate: string;
  deductions: string;
}): LabourVoucherAmounts | { error: string } {
  const quantity = parseNonNegativeNumber(input.attendanceQuantity);
  const rate = parseNonNegativeNumber(input.rate);
  const deductions = parseNonNegativeNumber(input.deductions ?? '0');

  if (quantity === null) {
    return { error: 'Attendance / quantity must be a non-negative number' };
  }
  if (rate === null) {
    return { error: 'Rate must be a non-negative number' };
  }
  if (deductions === null) {
    return { error: 'Deductions must be a non-negative number' };
  }
  if (quantity <= MONEY_EPS) {
    return { error: 'Attendance / quantity must be greater than zero' };
  }
  if (rate <= MONEY_EPS) {
    return { error: 'Rate must be greater than zero' };
  }

  const grossAmount = computeGrossAmount(quantity, rate);
  if (grossAmount <= MONEY_EPS) {
    return { error: 'Gross amount must be greater than zero' };
  }
  if (deductions > grossAmount + MONEY_EPS) {
    return { error: 'Deductions cannot exceed gross amount' };
  }

  const netAmount = computeNetAmount(grossAmount, deductions);
  if (netAmount <= MONEY_EPS) {
    return { error: 'Net amount must be greater than zero after deductions' };
  }

  if (!amountsReconcile(grossAmount, deductions, netAmount)) {
    return { error: 'Net amount does not reconcile with gross − deductions' };
  }

  return { quantity, rate, grossAmount, deductions, netAmount };
}
