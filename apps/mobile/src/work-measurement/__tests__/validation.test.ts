import {
  WorkMeasurementStatus,
  type PublicWorkMeasurement,
} from '../types';
import {
  computePreviousQuantity,
  roundQty,
  validateCumulativeWithinBoq,
  validateMeasurementForm,
} from '../validation';

describe('work-measurement validation', () => {
  it('rounds quantities to 6 decimals', () => {
    expect(roundQty(1.123456789)).toBe(1.123457);
  });

  it('computes previous quantity from submitted/verified only', () => {
    const rows: Array<
      Pick<PublicWorkMeasurement, 'id' | 'status' | 'currentQuantity'>
    > = [
      {
        id: '1',
        status: WorkMeasurementStatus.Verified,
        currentQuantity: 10,
      },
      {
        id: '2',
        status: WorkMeasurementStatus.Submitted,
        currentQuantity: 5,
      },
      {
        id: '3',
        status: WorkMeasurementStatus.Draft,
        currentQuantity: 99,
      },
      {
        id: '4',
        status: WorkMeasurementStatus.Rejected,
        currentQuantity: 7,
      },
    ];
    expect(computePreviousQuantity(rows)).toBe(15);
    expect(computePreviousQuantity(rows, '1')).toBe(5);
  });

  it('allows cumulative within BOQ quantity', () => {
    expect(
      validateCumulativeWithinBoq({
        previousQuantity: 80,
        currentQuantity: 20,
        boqPlannedQuantity: 100,
      }),
    ).toEqual({ ok: true, cumulativeQuantity: 100 });
  });

  it('rejects over-BOQ cumulative without approved variation (conflict)', () => {
    const result = validateCumulativeWithinBoq({
      previousQuantity: 90,
      currentQuantity: 20,
      boqPlannedQuantity: 100,
      hasApprovedVariationCap: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.cumulativeQuantity).toBe(110);
      expect(result.message).toMatch(/Approve a BOQ variation/);
    }
  });

  it('rejects cumulative over approved variation BOQ quantity', () => {
    const result = validateCumulativeWithinBoq({
      previousQuantity: 100,
      currentQuantity: 30,
      boqPlannedQuantity: 120,
      hasApprovedVariationCap: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/exceeds approved BOQ quantity/);
    }
  });

  it('validateMeasurementForm blocks over-BOQ and missing photos', () => {
    const base = {
      projectId: '507f1f77bcf86cd799439011',
      contractorId: '507f1f77bcf86cd799439012',
      boqItemId: '507f1f77bcf86cd799439013',
      location: 'Block A',
      measurementDate: '2026-07-20',
      currentQuantity: 20,
      previousQuantity: 90,
      boqPlannedQuantity: 100,
      photoCount: 1,
    };

    const overBoq = validateMeasurementForm(base);
    expect(overBoq.ok).toBe(false);
    if (!overBoq.ok) {
      expect(overBoq.message).toMatch(/exceeds BOQ/);
    }

    const noPhotos = validateMeasurementForm({
      ...base,
      currentQuantity: 5,
      photoCount: 0,
    });
    expect(noPhotos.ok).toBe(false);
    if (!noPhotos.ok) {
      expect(noPhotos.message).toMatch(/photo/i);
    }

    const ok = validateMeasurementForm({
      ...base,
      currentQuantity: 5,
      photoCount: 1,
    });
    expect(ok).toEqual({ ok: true });
  });
});
