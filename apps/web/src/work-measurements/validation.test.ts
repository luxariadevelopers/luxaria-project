import { describe, expect, it } from 'vitest';
import { WorkMeasurementStatus } from './types';
import {
  computePreviousQuantity,
  roundQty,
  validateCumulativeWithinBoq,
} from './validation';

describe('roundQty', () => {
  it('rounds to 6 decimal places', () => {
    expect(roundQty(1.123456789)).toBe(1.123457);
  });
});

describe('computePreviousQuantity', () => {
  it('sums submitted and verified current quantities', () => {
    const total = computePreviousQuantity([
      {
        id: '1',
        status: WorkMeasurementStatus.Submitted,
        currentQuantity: 10,
      },
      {
        id: '2',
        status: WorkMeasurementStatus.Verified,
        currentQuantity: 5,
      },
      {
        id: '3',
        status: WorkMeasurementStatus.Draft,
        currentQuantity: 99,
      },
    ]);
    expect(total).toBe(15);
  });

  it('excludes the row being edited', () => {
    const total = computePreviousQuantity(
      [
        {
          id: '1',
          status: WorkMeasurementStatus.Verified,
          currentQuantity: 10,
        },
        {
          id: '2',
          status: WorkMeasurementStatus.Verified,
          currentQuantity: 5,
        },
      ],
      '2',
    );
    expect(total).toBe(10);
  });
});

describe('validateCumulativeWithinBoq', () => {
  it('allows cumulative within BOQ quantity', () => {
    expect(
      validateCumulativeWithinBoq({
        previousQuantity: 90,
        currentQuantity: 10,
        boqPlannedQuantity: 100,
      }),
    ).toEqual({ ok: true, cumulativeQuantity: 100 });
  });

  it('rejects cumulative over BOQ without approved variation', () => {
    const result = validateCumulativeWithinBoq({
      previousQuantity: 95,
      currentQuantity: 10,
      boqPlannedQuantity: 100,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Approve a BOQ variation/);
    }
  });

  it('rejects cumulative over approved variation cap', () => {
    const result = validateCumulativeWithinBoq({
      previousQuantity: 115,
      currentQuantity: 10,
      boqPlannedQuantity: 120,
      hasApprovedVariationCap: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/exceeds approved BOQ quantity/);
    }
  });
});
