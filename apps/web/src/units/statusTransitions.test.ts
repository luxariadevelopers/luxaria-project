import { describe, expect, it } from 'vitest';
import {
  allowedNextStatuses,
  isValidUnitStatusTransition,
} from './statusTransitions';
import { UnitStatus } from './types';

describe('unit status transitions', () => {
  it('mirrors Nest allowed graph for happy path', () => {
    expect(
      isValidUnitStatusTransition(UnitStatus.Available, UnitStatus.Held),
    ).toBe(true);
    expect(
      isValidUnitStatusTransition(UnitStatus.Held, UnitStatus.Reserved),
    ).toBe(true);
    expect(
      isValidUnitStatusTransition(UnitStatus.Reserved, UnitStatus.Booked),
    ).toBe(true);
    expect(
      isValidUnitStatusTransition(
        UnitStatus.Booked,
        UnitStatus.AgreementExecuted,
      ),
    ).toBe(true);
    expect(
      isValidUnitStatusTransition(
        UnitStatus.AgreementExecuted,
        UnitStatus.Registered,
      ),
    ).toBe(true);
  });

  it('blocks registered → anything', () => {
    expect(allowedNextStatuses(UnitStatus.Registered)).toEqual([]);
    expect(
      isValidUnitStatusTransition(
        UnitStatus.Registered,
        UnitStatus.Available,
      ),
    ).toBe(false);
  });

  it('allows blocked / cancelled release to available', () => {
    expect(
      isValidUnitStatusTransition(UnitStatus.Blocked, UnitStatus.Available),
    ).toBe(true);
    expect(
      isValidUnitStatusTransition(UnitStatus.Cancelled, UnitStatus.Available),
    ).toBe(true);
  });
});
