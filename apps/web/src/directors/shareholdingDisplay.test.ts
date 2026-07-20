import { describe, expect, it } from 'vitest';
import {
  SEED_SHAREHOLDING_PERCENT_PER_DIRECTOR,
  formatShareholdingPercent,
  holdingForDirector,
  isSeedEqualShare,
} from './shareholdingDisplay';

describe('seed shareholding (25%)', () => {
  it('matches backend PERCENTAGE_PER_DIRECTOR seed constant', () => {
    expect(SEED_SHAREHOLDING_PERCENT_PER_DIRECTOR).toBe(25);
  });

  it('formats 25% seed display', () => {
    expect(formatShareholdingPercent(25)).toBe('25%');
    expect(isSeedEqualShare(25)).toBe(true);
    expect(isSeedEqualShare(30)).toBe(false);
  });

  it('resolves holding line for a director at 25%', () => {
    const holdings = [
      {
        directorId: 'd1',
        percentage: SEED_SHAREHOLDING_PERCENT_PER_DIRECTOR,
      },
      { directorId: 'd2', percentage: 25 },
      { directorId: 'd3', percentage: 25 },
      { directorId: 'd4', percentage: 25 },
    ];
    const total = holdings.reduce((s, h) => s + h.percentage, 0);
    expect(total).toBe(100);
    expect(holdingForDirector(holdings, 'd1')?.percentage).toBe(25);
    expect(
      formatShareholdingPercent(
        holdingForDirector(holdings, 'd1')!.percentage,
      ),
    ).toBe('25%');
  });
});
