import { describe, expect, it } from 'vitest';
import type { PublicShareholding } from '@/directors/types';
import {
  findOverlappingEffectiveDates,
  intervalsOverlap,
} from './effectiveDateOverlap';

function holding(
  partial: Pick<
    PublicShareholding,
    'id' | 'directorId' | 'effectiveFrom' | 'effectiveTo' | 'version'
  > &
    Partial<PublicShareholding>,
): PublicShareholding {
  return {
    companyId: 'co1',
    numberOfShares: 100,
    faceValue: 10,
    percentage: 25,
    approvalReference: null,
    documentId: null,
    changeRequestId: null,
    ...partial,
  };
}

describe('intervalsOverlap', () => {
  it('detects overlapping half-open ranges', () => {
    expect(
      intervalsOverlap('2024-01-01', '2024-06-01', '2024-03-01', '2024-09-01'),
    ).toBe(true);
  });

  it('allows abutting ranges (no overlap at boundary)', () => {
    expect(
      intervalsOverlap('2024-01-01', '2024-06-01', '2024-06-01', null),
    ).toBe(false);
  });

  it('flags two open-ended active rows for the same span', () => {
    expect(
      intervalsOverlap('2024-01-01', null, '2024-03-01', null),
    ).toBe(true);
  });
});

describe('findOverlappingEffectiveDates', () => {
  it('reports overlapping-effective-date errors per director', () => {
    const directorId = '507f1f77bcf86cd799439011';
    const rows = [
      holding({
        id: 'a',
        directorId,
        effectiveFrom: '2024-01-01T00:00:00.000Z',
        effectiveTo: null,
        version: 1,
      }),
      holding({
        id: 'b',
        directorId,
        effectiveFrom: '2024-06-01T00:00:00.000Z',
        effectiveTo: null,
        version: 2,
      }),
      holding({
        id: 'c',
        directorId: '507f1f77bcf86cd799439099',
        effectiveFrom: '2024-01-01T00:00:00.000Z',
        effectiveTo: null,
        version: 1,
      }),
    ];

    const overlaps = findOverlappingEffectiveDates(rows);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]?.directorId).toBe(directorId);
    expect(overlaps[0]?.message).toMatch(/Overlapping effective dates/);
    expect(overlaps[0]?.a.id).toBe('a');
    expect(overlaps[0]?.b.id).toBe('b');
  });

  it('accepts healthy versioned history (closed then open)', () => {
    const directorId = '507f1f77bcf86cd799439011';
    const rows = [
      holding({
        id: 'a',
        directorId,
        effectiveFrom: '2024-01-01T00:00:00.000Z',
        effectiveTo: '2024-06-01T00:00:00.000Z',
        version: 1,
      }),
      holding({
        id: 'b',
        directorId,
        effectiveFrom: '2024-06-01T00:00:00.000Z',
        effectiveTo: null,
        version: 2,
      }),
    ];
    expect(findOverlappingEffectiveDates(rows)).toEqual([]);
  });
});
