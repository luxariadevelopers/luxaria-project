import { isOccupiedUnitStatus } from './statusTransitions';
import {
  ACTIVE_BOOKING_STATUSES,
  UnitStatus,
  type ActiveBookingStatus,
  type LinkedBooking,
  type PublicUnit,
  type UnitStatus as Status,
} from './types';

export function isActiveBookingStatus(
  status: string,
): status is ActiveBookingStatus {
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function findActiveBooking(
  bookings: readonly LinkedBooking[],
): LinkedBooking | null {
  return bookings.find((b) => isActiveBookingStatus(b.status)) ?? null;
}

/**
 * Manual inventory status changes conflict with an active booking workflow.
 * Nest booking APIs drive unit status; the UI must not offer transitions that
 * would race an active hold/reserve/book/agreement/registered booking.
 */
export function canManuallyChangeUnitStatus(
  unit: PublicUnit,
  bookings: readonly LinkedBooking[],
): { ok: true } | { ok: false; reason: string } {
  const active = findActiveBooking(bookings);
  if (active) {
    return {
      ok: false,
      reason: `Unit has active booking ${active.bookingNumber} (${active.status}). Change status via the booking workflow.`,
    };
  }

  if (unit.bookingRefId && isOccupiedUnitStatus(unit.status)) {
    return {
      ok: false,
      reason:
        'Unit is linked to a booking reference while occupied. Resolve or cancel the booking before manual status changes.',
    };
  }

  return { ok: true };
}

/**
 * Which next statuses the UI may offer for a manual change.
 * Empty when an active booking blocks manual changes.
 */
export function manualAllowedNextStatuses(
  unit: PublicUnit,
  bookings: readonly LinkedBooking[],
  candidates: readonly Status[],
): Status[] {
  const gate = canManuallyChangeUnitStatus(unit, bookings);
  if (!gate.ok) return [];

  // Block is only meaningful from free / soft-hold inventory states.
  return candidates.filter((to) => {
    if (to === UnitStatus.Blocked) {
      return (
        unit.status === UnitStatus.Available ||
        unit.status === UnitStatus.Held ||
        unit.status === UnitStatus.Reserved
      );
    }
    return true;
  });
}

/** Nest blocks identity edits when occupied beyond held. */
export function canEditUnitIdentity(unit: PublicUnit): boolean {
  return (
    !isOccupiedUnitStatus(unit.status) || unit.status === UnitStatus.Held
  );
}
