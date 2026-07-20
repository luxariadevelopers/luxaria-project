import { describe, expect, it } from 'vitest';
import {
  assertLineDecision,
  assertResultMatchesLines,
  buildDefaultLineDecisions,
  completeInspectionSchema,
  inspectionCreateSchema,
} from './validation';
import { QualityInspectionResult } from './types';

const LINE_A = '507f1f77bcf86cd799439011';
const LINE_B = '507f1f77bcf86cd799439012';
const GRN_ID = '507f1f77bcf86cd799439013';

describe('assertLineDecision', () => {
  it('requires accepted + rejected to equal received', () => {
    const result = assertLineDecision({
      receivedQuantity: 100,
      acceptedQuantity: 90,
      rejectedQuantity: 5,
    });
    expect(result.ok).toBe(false);
  });

  it('requires rejection reason when rejectedQuantity > 0', () => {
    const result = assertLineDecision({
      receivedQuantity: 100,
      acceptedQuantity: 90,
      rejectedQuantity: 10,
      rejectionReason: 'ab',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/rejectionReason/);
    }
  });

  it('accepts balanced line with reason', () => {
    expect(
      assertLineDecision({
        receivedQuantity: 100,
        acceptedQuantity: 90,
        rejectedQuantity: 10,
        rejectionReason: 'Cracks',
      }).ok,
    ).toBe(true);
  });
});

describe('accepted / partial / rejected result flows', () => {
  it('accepted: all accepted, no rejected qty', () => {
    const match = assertResultMatchesLines({
      result: QualityInspectionResult.Accepted,
      items: [
        { acceptedQuantity: 100, rejectedQuantity: 0 },
        { acceptedQuantity: 50, rejectedQuantity: 0 },
      ],
    });
    expect(match.ok).toBe(true);

    const parsed = completeInspectionSchema.safeParse({
      result: QualityInspectionResult.Accepted,
      items: [
        {
          grnLineId: LINE_A,
          receivedQuantity: 100,
          acceptedQuantity: 100,
          rejectedQuantity: 0,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepted: rejects when any rejected quantity present', () => {
    const match = assertResultMatchesLines({
      result: QualityInspectionResult.Accepted,
      items: [{ acceptedQuantity: 90, rejectedQuantity: 10 }],
    });
    expect(match.ok).toBe(false);

    const parsed = completeInspectionSchema.safeParse({
      result: QualityInspectionResult.Accepted,
      items: [
        {
          grnLineId: LINE_A,
          receivedQuantity: 100,
          acceptedQuantity: 90,
          rejectedQuantity: 10,
          rejectionReason: 'Surface damage',
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('partially_accepted: requires both accepted and rejected quantities + reasons', () => {
    const match = assertResultMatchesLines({
      result: QualityInspectionResult.PartiallyAccepted,
      items: [
        { acceptedQuantity: 80, rejectedQuantity: 20 },
        { acceptedQuantity: 10, rejectedQuantity: 0 },
      ],
    });
    expect(match.ok).toBe(true);

    const ok = completeInspectionSchema.safeParse({
      result: QualityInspectionResult.PartiallyAccepted,
      items: [
        {
          grnLineId: LINE_A,
          receivedQuantity: 100,
          acceptedQuantity: 80,
          rejectedQuantity: 20,
          rejectionReason: 'Moisture high',
        },
        {
          grnLineId: LINE_B,
          receivedQuantity: 10,
          acceptedQuantity: 10,
          rejectedQuantity: 0,
        },
      ],
    });
    expect(ok.success).toBe(true);

    const missingReason = completeInspectionSchema.safeParse({
      result: QualityInspectionResult.PartiallyAccepted,
      items: [
        {
          grnLineId: LINE_A,
          receivedQuantity: 100,
          acceptedQuantity: 80,
          rejectedQuantity: 20,
          rejectionReason: '',
        },
      ],
    });
    expect(missingReason.success).toBe(false);
  });

  it('rejected: all rejected with reasons, no accepted qty', () => {
    const match = assertResultMatchesLines({
      result: QualityInspectionResult.Rejected,
      items: [
        { acceptedQuantity: 0, rejectedQuantity: 100 },
        { acceptedQuantity: 0, rejectedQuantity: 40 },
      ],
    });
    expect(match.ok).toBe(true);

    const parsed = completeInspectionSchema.safeParse({
      result: QualityInspectionResult.Rejected,
      items: [
        {
          grnLineId: LINE_A,
          receivedQuantity: 100,
          acceptedQuantity: 0,
          rejectedQuantity: 100,
          rejectionReason: 'Failed compressive test',
        },
      ],
    });
    expect(parsed.success).toBe(true);

    const withAccepted = completeInspectionSchema.safeParse({
      result: QualityInspectionResult.Rejected,
      items: [
        {
          grnLineId: LINE_A,
          receivedQuantity: 100,
          acceptedQuantity: 10,
          rejectedQuantity: 90,
          rejectionReason: 'Failed compressive test',
        },
      ],
    });
    expect(withAccepted.success).toBe(false);
  });

  it('hold: allows empty items', () => {
    expect(
      assertResultMatchesLines({
        result: QualityInspectionResult.Hold,
        items: [],
      }).ok,
    ).toBe(true);

    const parsed = completeInspectionSchema.safeParse({
      result: QualityInspectionResult.Hold,
      items: [],
      remarks: 'Awaiting lab report',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('inspectionCreateSchema', () => {
  it('requires GRN ObjectId and date', () => {
    expect(
      inspectionCreateSchema.safeParse({
        grnId: '',
        inspectionDate: '',
      }).success,
    ).toBe(false);

    expect(
      inspectionCreateSchema.safeParse({
        grnId: GRN_ID,
        inspectionDate: '2026-07-20',
      }).success,
    ).toBe(true);
  });
});

describe('buildDefaultLineDecisions', () => {
  const items = [
    {
      grnLineId: LINE_A,
      receivedQuantity: 100,
    },
  ];

  it('prefills full accept / full reject', () => {
    expect(
      buildDefaultLineDecisions(items, QualityInspectionResult.Accepted)[0],
    ).toMatchObject({
      acceptedQuantity: 100,
      rejectedQuantity: 0,
    });
    expect(
      buildDefaultLineDecisions(items, QualityInspectionResult.Rejected)[0],
    ).toMatchObject({
      acceptedQuantity: 0,
      rejectedQuantity: 100,
    });
  });
});
