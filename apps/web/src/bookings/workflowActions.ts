import { BookingStatus } from '@/status';
import type { BookingCapabilities } from './roleAccess';
import type { PublicBooking } from './types';

export type BookingActionId =
  | 'approve_discount'
  | 'reject_discount'
  | 'transition_reserved'
  | 'transition_booked'
  | 'transition_agreement'
  | 'transition_registered'
  | 'cancel';

const TERMINAL_STATUSES = new Set<string>([
  BookingStatus.Registered,
  BookingStatus.Expired,
  BookingStatus.Cancelled,
]);

export function canApproveBookingDiscount(
  booking: Pick<PublicBooking, 'status'>,
  caps: BookingCapabilities,
): boolean {
  return (
    caps.canApprove && booking.status === BookingStatus.PendingApproval
  );
}

export function canRejectBookingDiscount(
  booking: Pick<PublicBooking, 'status'>,
  caps: BookingCapabilities,
): boolean {
  return canApproveBookingDiscount(booking, caps);
}

export function canCancelBooking(
  booking: Pick<PublicBooking, 'status'>,
  caps: BookingCapabilities,
): boolean {
  if (!caps.canCreate || TERMINAL_STATUSES.has(booking.status)) {
    return false;
  }
  return (
    booking.status === BookingStatus.Hold ||
    booking.status === BookingStatus.PendingApproval ||
    booking.status === BookingStatus.Reserved
  );
}

export function canTransitionBookingTo(
  booking: Pick<
    PublicBooking,
    'status' | 'discountApprovalRequired' | 'discountApproved'
  >,
  target: typeof BookingStatus.Reserved | typeof BookingStatus.Booked | typeof BookingStatus.Agreement | typeof BookingStatus.Registered,
  caps: BookingCapabilities,
): boolean {
  if (!caps.canCreate || TERMINAL_STATUSES.has(booking.status)) {
    return false;
  }

  switch (target) {
    case BookingStatus.Reserved:
      return (
        booking.status === BookingStatus.Hold &&
        (!booking.discountApprovalRequired || booking.discountApproved)
      );
    case BookingStatus.Booked:
      return booking.status === BookingStatus.Reserved;
    case BookingStatus.Agreement:
      return booking.status === BookingStatus.Booked;
    case BookingStatus.Registered:
      return booking.status === BookingStatus.Agreement;
    default:
      return false;
  }
}

export function resolveBookingDetailActions(
  booking: Pick<
    PublicBooking,
    'status' | 'discountApprovalRequired' | 'discountApproved'
  >,
  caps: BookingCapabilities,
): BookingActionId[] {
  const actions: BookingActionId[] = [];

  if (canApproveBookingDiscount(booking, caps)) {
    actions.push('approve_discount', 'reject_discount');
  }

  if (canTransitionBookingTo(booking, BookingStatus.Reserved, caps)) {
    actions.push('transition_reserved');
  }
  if (canTransitionBookingTo(booking, BookingStatus.Booked, caps)) {
    actions.push('transition_booked');
  }
  if (canTransitionBookingTo(booking, BookingStatus.Agreement, caps)) {
    actions.push('transition_agreement');
  }
  if (canTransitionBookingTo(booking, BookingStatus.Registered, caps)) {
    actions.push('transition_registered');
  }

  if (canCancelBooking(booking, caps)) {
    actions.push('cancel');
  }

  return actions;
}

export function transitionActionLabel(action: BookingActionId): string {
  switch (action) {
    case 'transition_reserved':
      return 'Mark reserved';
    case 'transition_booked':
      return 'Mark booked';
    case 'transition_agreement':
      return 'Mark agreement';
    case 'transition_registered':
      return 'Mark registered';
    case 'approve_discount':
      return 'Approve discount';
    case 'reject_discount':
      return 'Reject discount';
    case 'cancel':
      return 'Cancel booking';
    default:
      return action;
  }
}

export function transitionTargetStatus(
  action: BookingActionId,
): typeof BookingStatus.Reserved | typeof BookingStatus.Booked | typeof BookingStatus.Agreement | typeof BookingStatus.Registered | null {
  switch (action) {
    case 'transition_reserved':
      return BookingStatus.Reserved;
    case 'transition_booked':
      return BookingStatus.Booked;
    case 'transition_agreement':
      return BookingStatus.Agreement;
    case 'transition_registered':
      return BookingStatus.Registered;
    default:
      return null;
  }
}
