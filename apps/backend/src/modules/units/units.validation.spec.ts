import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  assertCanClaimUnit,
  assertStatusTransition,
  computeTotalPrice,
  normalizeUnitLabel,
} from './units.validation';
import { UnitStatus } from './schemas/unit.schema';

describe('units.validation', () => {
  it('normalizes block / floor / unit labels', () => {
    expect(normalizeUnitLabel(' a-101 ', 'unitNumber')).toBe('A-101');
    expect(() => normalizeUnitLabel('  ', 'block')).toThrow(BadRequestException);
  });

  it('allows the sales status progression', () => {
    expect(() =>
      assertStatusTransition(UnitStatus.Available, UnitStatus.Held),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(UnitStatus.Held, UnitStatus.Reserved),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(UnitStatus.Reserved, UnitStatus.Booked),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(UnitStatus.Booked, UnitStatus.AgreementExecuted),
    ).not.toThrow();
    expect(() =>
      assertStatusTransition(
        UnitStatus.AgreementExecuted,
        UnitStatus.Registered,
      ),
    ).not.toThrow();
  });

  it('rejects invalid transitions', () => {
    expect(() =>
      assertStatusTransition(UnitStatus.Registered, UnitStatus.Available),
    ).toThrow(BadRequestException);
    expect(() =>
      assertStatusTransition(UnitStatus.Booked, UnitStatus.Available),
    ).toThrow(BadRequestException);
  });

  it('prevents claiming a unit that is already in an occupied sale status', () => {
    expect(() =>
      assertCanClaimUnit(UnitStatus.Booked, UnitStatus.Reserved),
    ).toThrow(ConflictException);
    expect(() =>
      assertCanClaimUnit(UnitStatus.Reserved, UnitStatus.Booked),
    ).not.toThrow();
  });

  it('computes total price', () => {
    expect(
      computeTotalPrice({
        basePrice: 7500000,
        additionalCharges: 250000,
        tax: 375000,
      }),
    ).toBe(8125000);
  });
});
