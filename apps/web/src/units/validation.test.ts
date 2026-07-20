import { describe, expect, it } from 'vitest';
import {
  assertUniqueUnitInList,
  assertUnitStatusTransition,
  computeTotalPrice,
  unitFormSchema,
} from './validation';
import { UnitStatus, UnitType, type PublicUnit } from './types';

const oid = '507f1f77bcf86cd799439011';
const projectId = '507f1f77bcf86cd799439012';

function sampleUnit(overrides: Partial<PublicUnit> = {}): PublicUnit {
  return {
    id: oid,
    projectId,
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
    additionalCharges: 250_000,
    tax: 375_000,
    totalPrice: 8_125_000,
    status: UnitStatus.Available,
    bookingRefId: null,
    notes: null,
    ...overrides,
  };
}

describe('assertUniqueUnitInList', () => {
  it('rejects duplicate unit within project/block', () => {
    const result = assertUniqueUnitInList({
      projectId,
      block: 'a',
      unitNumber: '1201',
      existing: [sampleUnit()],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/already exists/i);
    }
  });

  it('allows same unit number in a different block', () => {
    const result = assertUniqueUnitInList({
      projectId,
      block: 'B',
      unitNumber: '1201',
      existing: [sampleUnit()],
    });
    expect(result).toEqual({ ok: true });
  });

  it('allows edit of the same row (excludeId)', () => {
    const result = assertUniqueUnitInList({
      projectId,
      block: 'A',
      unitNumber: '1201',
      existing: [sampleUnit()],
      excludeId: oid,
    });
    expect(result).toEqual({ ok: true });
  });
});

describe('assertUnitStatusTransition', () => {
  it('allows available → held / blocked', () => {
    expect(
      assertUnitStatusTransition(UnitStatus.Available, UnitStatus.Held),
    ).toEqual({ ok: true });
    expect(
      assertUnitStatusTransition(UnitStatus.Available, UnitStatus.Blocked),
    ).toEqual({ ok: true });
  });

  it('allows sale progression held → reserved → booked → agreement → registered', () => {
    expect(
      assertUnitStatusTransition(UnitStatus.Held, UnitStatus.Reserved),
    ).toEqual({ ok: true });
    expect(
      assertUnitStatusTransition(UnitStatus.Reserved, UnitStatus.Booked),
    ).toEqual({ ok: true });
    expect(
      assertUnitStatusTransition(
        UnitStatus.Booked,
        UnitStatus.AgreementExecuted,
      ),
    ).toEqual({ ok: true });
    expect(
      assertUnitStatusTransition(
        UnitStatus.AgreementExecuted,
        UnitStatus.Registered,
      ),
    ).toEqual({ ok: true });
  });

  it('rejects invalid transitions', () => {
    const result = assertUnitStatusTransition(
      UnitStatus.Registered,
      UnitStatus.Available,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Invalid unit status transition/);
    }

    expect(
      assertUnitStatusTransition(UnitStatus.Booked, UnitStatus.Available).ok,
    ).toBe(false);
  });
});

describe('computeTotalPrice / unitFormSchema', () => {
  it('sums base + charges + tax', () => {
    expect(
      computeTotalPrice({
        basePrice: 100,
        additionalCharges: 20,
        tax: 5.5,
      }),
    ).toBe(125.5);
  });

  it('accepts valid create payload', () => {
    const parsed = unitFormSchema.safeParse({
      projectId,
      block: 'A',
      floor: '1',
      unitNumber: '101',
      unitType: UnitType.OneBhk,
      carpetArea: 600,
      builtUpArea: 750,
      uds: 200,
      facing: '',
      parking: '',
      basePrice: 5_000_000,
      additionalCharges: 0,
      tax: 0,
      status: UnitStatus.Available,
      notes: '',
    });
    expect(parsed.success).toBe(true);
  });
});
