import { describe, expect, it } from 'vitest';
import {
  canEditUnitIdentity,
  canManuallyChangeUnitStatus,
  findActiveBooking,
  manualAllowedNextStatuses,
} from './bookedRestrictions';
import { allowedNextStatuses } from './statusTransitions';
import {
  UnitStatus,
  UnitType,
  type LinkedBooking,
  type PublicUnit,
} from './types';

const unit: PublicUnit = {
  id: '507f1f77bcf86cd799439011',
  projectId: '507f1f77bcf86cd799439012',
  block: 'A',
  floor: '12',
  unitNumber: '1201',
  unitType: UnitType.TwoBhk,
  carpetArea: 850,
  builtUpArea: 1050,
  uds: 320,
  facing: null,
  parking: null,
  basePrice: 7_500_000,
  additionalCharges: 0,
  tax: 0,
  totalPrice: 7_500_000,
  status: UnitStatus.Booked,
  bookingRefId: '507f1f77bcf86cd799439013',
  notes: null,
};

function booking(overrides: Partial<LinkedBooking> = {}): LinkedBooking {
  return {
    id: '507f1f77bcf86cd799439013',
    bookingNumber: 'BK-001',
    customerId: '507f1f77bcf86cd799439014',
    projectId: unit.projectId,
    unitId: unit.id,
    bookingDate: '2026-01-01T00:00:00.000Z',
    bookingAmount: 100_000,
    agreedPrice: 7_500_000,
    discount: 0,
    approvedPrice: 7_500_000,
    status: 'booked',
    holdExpiresAt: null,
    cancelledAt: null,
    expiredAt: null,
    cancellationReason: null,
    ...overrides,
  };
}

describe('booked-unit restrictions', () => {
  it('detects active booking', () => {
    expect(findActiveBooking([booking({ status: 'cancelled' })])).toBeNull();
    expect(findActiveBooking([booking({ status: 'booked' })])?.bookingNumber).toBe(
      'BK-001',
    );
  });

  it('blocks manual status change when booking is active', () => {
    const result = canManuallyChangeUnitStatus(unit, [booking()]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/active booking/i);
    }
    expect(
      manualAllowedNextStatuses(
        unit,
        [booking()],
        allowedNextStatuses(unit.status),
      ),
    ).toEqual([]);
  });

  it('allows manual status when no active booking and unit available', () => {
    const free: PublicUnit = {
      ...unit,
      status: UnitStatus.Available,
      bookingRefId: null,
    };
    expect(canManuallyChangeUnitStatus(free, []).ok).toBe(true);
    expect(
      manualAllowedNextStatuses(
        free,
        [],
        allowedNextStatuses(UnitStatus.Available),
      ),
    ).toContain(UnitStatus.Blocked);
  });

  it('locks identity edit when booked', () => {
    expect(canEditUnitIdentity(unit)).toBe(false);
    expect(
      canEditUnitIdentity({ ...unit, status: UnitStatus.Held }),
    ).toBe(true);
    expect(
      canEditUnitIdentity({
        ...unit,
        status: UnitStatus.Available,
        bookingRefId: null,
      }),
    ).toBe(true);
  });
});
