import { BadRequestException } from '@nestjs/common';
import {
  assertCumulativeWithinBoq,
  mergePhotoDocumentIds,
  normalizeMeasurementDate,
  roundQty,
} from './work-measurement.validation';

describe('work-measurement.validation', () => {
  it('rounds quantities to 6 decimals', () => {
    expect(roundQty(1.123456789)).toBe(1.123457);
  });

  it('normalizes measurementDate to UTC midnight', () => {
    const date = normalizeMeasurementDate('2026-07-17T15:30:00.000Z');
    expect(date.toISOString()).toBe('2026-07-17T00:00:00.000Z');
  });

  it('merges photo document ids from array and attachments', () => {
    const ids = mergePhotoDocumentIds({
      ids: ['a', 'b'],
      attachments: {
        photo_0: 'c',
        photos: 'd',
        other: 'x',
      },
    });
    expect(ids.sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('allows cumulative within BOQ quantity', () => {
    expect(() =>
      assertCumulativeWithinBoq({
        cumulativeQuantity: 100,
        boqPlannedQuantity: 100,
        hasApprovedVariationCap: false,
      }),
    ).not.toThrow();
  });

  it('rejects cumulative over BOQ without approved variation', () => {
    expect(() =>
      assertCumulativeWithinBoq({
        cumulativeQuantity: 110,
        boqPlannedQuantity: 100,
        hasApprovedVariationCap: false,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertCumulativeWithinBoq({
        cumulativeQuantity: 110,
        boqPlannedQuantity: 100,
        hasApprovedVariationCap: false,
      }),
    ).toThrow(/Approve a BOQ variation/);
  });

  it('rejects cumulative over approved variation BOQ quantity', () => {
    expect(() =>
      assertCumulativeWithinBoq({
        cumulativeQuantity: 130,
        boqPlannedQuantity: 120,
        hasApprovedVariationCap: true,
      }),
    ).toThrow(/exceeds approved BOQ quantity/);
  });
});
