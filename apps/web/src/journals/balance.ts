/** Mirrors Nest `MONEY_EPS` / `moneyEquals` in journal.validation.ts */
const MONEY_EPS = 0.005;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) < MONEY_EPS;
}

/** Nest requires totalDebit === totalCredit on every persisted journal. */
export function isJournalBalanced(
  totalDebit: number,
  totalCredit: number,
): boolean {
  return moneyEquals(totalDebit, totalCredit);
}

export function sumJournalTotals(
  rows: readonly { totalDebit: number; totalCredit: number }[],
): { totalDebit: number; totalCredit: number; balanced: boolean } {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const row of rows) {
    totalDebit = roundMoney(totalDebit + row.totalDebit);
    totalCredit = roundMoney(totalCredit + row.totalCredit);
  }
  return {
    totalDebit,
    totalCredit,
    balanced: isJournalBalanced(totalDebit, totalCredit),
  };
}
