import { BadRequestException } from '@nestjs/common';
import {
  assertLineDecision,
  assertResultMatchesLines,
  computeVendorQualityScore,
} from './quality-inspections.validation';
import { QualityInspectionResult } from './schemas/quality-inspection.schema';

describe('quality-inspections.validation', () => {
  it('requires accepted + rejected = received', () => {
    expect(() =>
      assertLineDecision({
        receivedQuantity: 100,
        acceptedQuantity: 90,
        rejectedQuantity: 5,
      }),
    ).toThrow(/must equal/);
  });

  it('requires rejection reason when rejecting qty', () => {
    expect(() =>
      assertLineDecision({
        receivedQuantity: 100,
        acceptedQuantity: 90,
        rejectedQuantity: 10,
        rejectionReason: 'x',
      }),
    ).toThrow(/rejectionReason/);
  });

  it('validates result vs line mix', () => {
    expect(() =>
      assertResultMatchesLines({
        result: QualityInspectionResult.Accepted,
        items: [{ acceptedQuantity: 90, rejectedQuantity: 10 }],
      }),
    ).toThrow(/partially_accepted/);

    expect(() =>
      assertResultMatchesLines({
        result: QualityInspectionResult.PartiallyAccepted,
        items: [{ acceptedQuantity: 100, rejectedQuantity: 0 }],
      }),
    ).toThrow(/both accepted and rejected/);

    expect(() =>
      assertResultMatchesLines({
        result: QualityInspectionResult.Rejected,
        items: [{ acceptedQuantity: 0, rejectedQuantity: 100 }],
      }),
    ).not.toThrow();
  });

  it('computes vendor quality score weights', () => {
    const score = computeVendorQualityScore({
      acceptedCount: 2,
      partiallyAcceptedCount: 1,
      rejectedCount: 1,
      holdCount: 0,
    });
    // (100+100+60+0)/4 = 65
    expect(score.score).toBe(65);
    expect(score.inspectionsCount).toBe(4);
    expect(score.ratingEquivalent).toBe(3.25);
  });

  it('rejects empty non-hold completion', () => {
    expect(() =>
      assertResultMatchesLines({
        result: QualityInspectionResult.Accepted,
        items: [],
      }),
    ).toThrow(BadRequestException);
  });
});
