import { describe, expect, it } from 'vitest';
import { isJournalBalanced, sumJournalTotals } from './balance';

describe('journal balance helpers', () => {
  it('treats equal debit/credit as balanced', () => {
    expect(isJournalBalanced(1000, 1000)).toBe(true);
    // Within Nest MONEY_EPS (0.005) after 2-decimal rounding
    expect(isJournalBalanced(1000.004, 1000)).toBe(true);
  });

  it('flags unequal totals', () => {
    expect(isJournalBalanced(1000, 999)).toBe(false);
  });

  it('sums page totals', () => {
    const totals = sumJournalTotals([
      { totalDebit: 100, totalCredit: 100 },
      { totalDebit: 50.5, totalCredit: 50.5 },
    ]);
    expect(totals.totalDebit).toBe(150.5);
    expect(totals.totalCredit).toBe(150.5);
    expect(totals.balanced).toBe(true);
  });
});
