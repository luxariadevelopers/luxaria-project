import { UnitStatus, type UnitStatus as Status } from './types';

/**
 * Mirror of Nest `ALLOWED_STATUS_TRANSITIONS`
 * (`apps/backend/src/modules/units/units.validation.ts`).
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<Status, readonly Status[]> = {
  [UnitStatus.Available]: [
    UnitStatus.Held,
    UnitStatus.Reserved,
    UnitStatus.Booked,
    UnitStatus.Blocked,
    UnitStatus.Cancelled,
  ],
  [UnitStatus.Held]: [
    UnitStatus.Available,
    UnitStatus.Reserved,
    UnitStatus.Booked,
    UnitStatus.Cancelled,
    UnitStatus.Blocked,
  ],
  [UnitStatus.Reserved]: [
    UnitStatus.Booked,
    UnitStatus.Available,
    UnitStatus.Cancelled,
    UnitStatus.Blocked,
  ],
  [UnitStatus.Booked]: [UnitStatus.AgreementExecuted, UnitStatus.Cancelled],
  [UnitStatus.AgreementExecuted]: [
    UnitStatus.Registered,
    UnitStatus.Cancelled,
  ],
  [UnitStatus.Registered]: [],
  [UnitStatus.Cancelled]: [UnitStatus.Available],
  [UnitStatus.Blocked]: [UnitStatus.Available],
};

export function isValidUnitStatusTransition(from: Status, to: Status): boolean {
  if (from === to) return true;
  return (ALLOWED_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedNextStatuses(from: Status): Status[] {
  return [...(ALLOWED_STATUS_TRANSITIONS[from] ?? [])];
}

/** Statuses that already claim the unit for a buyer / hold. */
export const OCCUPIED_UNIT_STATUSES: readonly Status[] = [
  UnitStatus.Held,
  UnitStatus.Reserved,
  UnitStatus.Booked,
  UnitStatus.AgreementExecuted,
  UnitStatus.Registered,
];

export function isOccupiedUnitStatus(status: Status): boolean {
  return OCCUPIED_UNIT_STATUSES.includes(status);
}
