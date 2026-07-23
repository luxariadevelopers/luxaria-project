import { describe, expect, it } from '@jest/globals';
import {
  applyEqualDirectorCommitments,
  equalDirectorCommitments,
} from '../capitalPlan';

describe('equalDirectorCommitments', () => {
  it('splits remaining budget equally across directors', () => {
    expect(equalDirectorCommitments(1_000_000, 2, 0)).toEqual([
      500_000, 500_000,
    ]);
  });

  it('subtracts investor commitments before splitting', () => {
    expect(equalDirectorCommitments(1_000_000, 2, 200_000)).toEqual([
      400_000, 400_000,
    ]);
  });

  it('gives remainder paise to the last director', () => {
    const amounts = equalDirectorCommitments(100, 3, 0);
    expect(amounts).toHaveLength(3);
    expect(amounts.reduce((s, n) => s + n, 0)).toBeCloseTo(100, 2);
  });

  it('returns empty when no directors', () => {
    expect(equalDirectorCommitments(1_000_000, 0, 0)).toEqual([]);
  });
});

describe('applyEqualDirectorCommitments', () => {
  it('writes commitment amounts onto director rows', () => {
    const rows = applyEqualDirectorCommitments(
      [
        { directorId: 'a', profitSharePercent: '50', commitmentAmount: '' },
        { directorId: 'b', profitSharePercent: '50', commitmentAmount: '' },
      ],
      1_000_000,
      0,
    );
    expect(rows.map((r) => r.commitmentAmount)).toEqual([
      '500000',
      '500000',
    ]);
  });
});
