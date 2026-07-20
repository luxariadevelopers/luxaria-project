import { describe, expect, it } from 'vitest';
import {
  assessProfitShareTotal,
  PROFIT_SHARE_PERCENT_TOLERANCE,
  sumProfitSharePercentages,
} from './profitShareTotal';

describe('assessProfitShareTotal', () => {
  it('marks exactly 100% as balanced', () => {
    const result = assessProfitShareTotal(100);
    expect(result.status).toBe('balanced');
    expect(result.isBalanced).toBe(true);
  });

  it('accepts Nest tolerance around 100%', () => {
    // Stay inside tolerance (float noise makes `100 ± 0.0001` exceed it).
    expect(
      assessProfitShareTotal(100 + PROFIT_SHARE_PERCENT_TOLERANCE / 2)
        .isBalanced,
    ).toBe(true);
    expect(
      assessProfitShareTotal(100 - PROFIT_SHARE_PERCENT_TOLERANCE / 2)
        .isBalanced,
    ).toBe(true);
    expect(
      assessProfitShareTotal(100 + PROFIT_SHARE_PERCENT_TOLERANCE * 2)
        .isBalanced,
    ).toBe(false);
  });

  it('warns when under or over 100%', () => {
    expect(assessProfitShareTotal(80).status).toBe('under');
    expect(assessProfitShareTotal(80).isBalanced).toBe(false);
    expect(assessProfitShareTotal(110).status).toBe('over');
    expect(assessProfitShareTotal(110).isBalanced).toBe(false);
  });

  it('treats empty / zero as empty', () => {
    expect(assessProfitShareTotal(0).status).toBe('empty');
    expect(assessProfitShareTotal(Number.NaN).status).toBe('empty');
  });
});

describe('sumProfitSharePercentages', () => {
  it('sums approved profit-share columns', () => {
    expect(
      sumProfitSharePercentages([
        { approvedProfitSharePercentage: 25 },
        { approvedProfitSharePercentage: 25 },
        { approvedProfitSharePercentage: 50 },
      ]),
    ).toBe(100);
  });

  it('ignores non-finite values', () => {
    expect(
      sumProfitSharePercentages([
        { approvedProfitSharePercentage: 40 },
        { approvedProfitSharePercentage: Number.NaN },
      ]),
    ).toBe(40);
  });
});
