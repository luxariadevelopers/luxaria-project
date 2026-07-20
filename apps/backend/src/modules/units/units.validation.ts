import { BadRequestException, ConflictException } from '@nestjs/common';
import { UnitStatus } from './schemas/unit.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundArea(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function normalizeUnitLabel(value: string, field: string): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException(`${field} is required`);
  }
  return normalized;
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

/** Statuses that already claim the unit for a buyer / hold. */
export const OCCUPIED_UNIT_STATUSES: UnitStatus[] = [
  UnitStatus.Held,
  UnitStatus.Reserved,
  UnitStatus.Booked,
  UnitStatus.AgreementExecuted,
  UnitStatus.Registered,
];

export function isOccupiedStatus(status: UnitStatus): boolean {
  return OCCUPIED_UNIT_STATUSES.includes(status);
}

const ALLOWED_STATUS_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
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
  [UnitStatus.Booked]: [
    UnitStatus.AgreementExecuted,
    UnitStatus.Cancelled,
  ],
  [UnitStatus.AgreementExecuted]: [
    UnitStatus.Registered,
    UnitStatus.Cancelled,
  ],
  [UnitStatus.Registered]: [],
  [UnitStatus.Cancelled]: [UnitStatus.Available],
  [UnitStatus.Blocked]: [UnitStatus.Available],
};

export function assertStatusTransition(from: UnitStatus, to: UnitStatus): void {
  if (from === to) return;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid unit status transition from "${from}" to "${to}"`,
    );
  }
}

/**
 * Double-booking guard: claiming statuses may only be entered from
 * available / held (held → reserved/booked is allowed).
 */
export function assertCanClaimUnit(
  currentStatus: UnitStatus,
  nextStatus: UnitStatus,
): void {
  if (!isOccupiedStatus(nextStatus) || nextStatus === UnitStatus.Held) {
    return;
  }
  // Moving into reserved/booked/agreement/registered from another occupied state
  // other than held is a double-book attempt (except progressing the same sale).
  const saleProgression: Partial<Record<UnitStatus, UnitStatus[]>> = {
    [UnitStatus.Available]: [
      UnitStatus.Held,
      UnitStatus.Reserved,
      UnitStatus.Booked,
    ],
    [UnitStatus.Held]: [UnitStatus.Reserved, UnitStatus.Booked],
    [UnitStatus.Reserved]: [UnitStatus.Booked],
    [UnitStatus.Booked]: [UnitStatus.AgreementExecuted],
    [UnitStatus.AgreementExecuted]: [UnitStatus.Registered],
  };
  const allowedFrom = saleProgression[currentStatus] ?? [];
  if (
    isOccupiedStatus(nextStatus) &&
    !allowedFrom.includes(nextStatus) &&
    currentStatus !== nextStatus
  ) {
    throw new ConflictException(
      `Unit is already ${currentStatus}; cannot change to ${nextStatus} (double booking prevented)`,
    );
  }
}

export function computeTotalPrice(input: {
  basePrice: number;
  additionalCharges: number;
  tax: number;
}): number {
  return roundMoney(
    input.basePrice + input.additionalCharges + input.tax,
  );
}
