import { describe, expect, it } from 'vitest';
import {
  assessTotalPercentage,
  SHAREHOLDING_PERCENT_TOLERANCE,
  sumHoldingPercentages,
} from './totalPercentage';

describe('assessTotalPercentage', () => {
  it('marks 100% as balanced', () => {
    const result = assessTotalPercentage(100);
    expect(result.status).toBe('balanced');
    expect(result.isValid).toBe(true);
  });

  it('accepts Nest tolerance around 100%', () => {
    const within = SHAREHOLDING_PERCENT_TOLERANCE / 2;
    expect(assessTotalPercentage(100 + within).isValid).toBe(true);
    expect(assessTotalPercentage(100 - within).isValid).toBe(true);
  });

  it('rejects totals under or over 100%', () => {
    expect(assessTotalPercentage(99.9).status).toBe('under');
    expect(assessTotalPercentage(99.9).isValid).toBe(false);
    expect(assessTotalPercentage(100.1).status).toBe('over');
    expect(assessTotalPercentage(100.1).isValid).toBe(false);
  });

  it('treats empty / non-positive totals as invalid', () => {
    expect(assessTotalPercentage(0).status).toBe('empty');
    expect(assessTotalPercentage(0).isValid).toBe(false);
  });
});

describe('sumHoldingPercentages', () => {
  it('sums seed-style equal holdings to 100%', () => {
    const total = sumHoldingPercentages([
      { percentage: 25 },
      { percentage: 25 },
      { percentage: 25 },
      { percentage: 25 },
    ]);
    expect(total).toBe(100);
    expect(assessTotalPercentage(total).isValid).toBe(true);
  });
});
