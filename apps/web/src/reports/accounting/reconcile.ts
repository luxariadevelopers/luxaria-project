import type { CashBankBookPayload, LedgerLineRow } from './types';

const EPS = 0.005;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS;
}

/**
 * Validate Nest ledger math: opening + period debit − period credit = closing.
 */
export function validateOpeningMovementsClosing(input: {
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
}): { ok: boolean; expectedClosing: number } {
  const expectedClosing = round2(
    input.openingBalance + input.periodDebit - input.periodCredit,
  );
  return {
    ok: nearlyEqual(expectedClosing, round2(input.closingBalance)),
    expectedClosing,
  };
}

/**
 * Recompute running balances from opening + chronological rows.
 * Used to verify Nest `runningBalance` and for unit tests.
 */
export function computeRunningBalances(
  openingBalance: number,
  rows: readonly Pick<LedgerLineRow, 'debit' | 'credit'>[],
): number[] {
  let running = round2(openingBalance);
  return rows.map((row) => {
    running = round2(running + row.debit - row.credit);
    return running;
  });
}

export function runningBalancesMatch(
  openingBalance: number,
  rows: readonly Pick<LedgerLineRow, 'debit' | 'credit' | 'runningBalance'>[],
): boolean {
  const computed = computeRunningBalances(openingBalance, rows);
  return rows.every((row, i) =>
    nearlyEqual(round2(row.runningBalance), computed[i]!),
  );
}

export function validateCashBankBookPayload(payload: CashBankBookPayload): {
  totalsOk: boolean;
  runningOk: boolean;
  expectedClosing: number;
} {
  const totals = payload.totals;
  const totalsCheck = validateOpeningMovementsClosing({
    openingBalance: totals.openingBalance,
    periodDebit: totals.debit,
    periodCredit: totals.credit,
    closingBalance: totals.closingBalance,
  });
  return {
    totalsOk: totalsCheck.ok && payload.meta.reconciled,
    runningOk: runningBalancesMatch(payload.openingBalance, payload.rows),
    expectedClosing: totalsCheck.expectedClosing,
  };
}
