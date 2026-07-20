/**
 * Source: `apps/backend/src/modules/bookings/schemas/booking.schema.ts`
 * Transitions: `bookings.validation.ts` (`ALLOWED_STATUS_TRANSITIONS`).
 */
import { createStatusCatalog } from './create-status-catalog';

export const BookingStatus = {
  Hold: 'hold',
  PendingApproval: 'pending_approval',
  Reserved: 'reserved',
  Booked: 'booked',
  Agreement: 'agreement',
  Registered: 'registered',
  Expired: 'expired',
  Cancelled: 'cancelled',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

/** Mirrors backend `ACTIVE_BOOKING_STATUSES`. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.Hold,
  BookingStatus.PendingApproval,
  BookingStatus.Reserved,
  BookingStatus.Booked,
  BookingStatus.Agreement,
  BookingStatus.Registered,
];

/** Mirrors backend `WORKFLOW_PROGRESSION`. */
export const BOOKING_WORKFLOW_PROGRESSION: readonly BookingStatus[] = [
  BookingStatus.Hold,
  BookingStatus.Reserved,
  BookingStatus.Booked,
  BookingStatus.Agreement,
  BookingStatus.Registered,
];

export const bookingStatusCatalog = createStatusCatalog({
  values: Object.values(BookingStatus) as BookingStatus[],
  labels: {
    hold: 'Hold',
    pending_approval: 'Pending Approval',
    reserved: 'Reserved',
    booked: 'Booked',
    agreement: 'Agreement',
    registered: 'Registered',
    expired: 'Expired',
    cancelled: 'Cancelled',
  },
  badgeVariants: {
    hold: 'warning',
    pending_approval: 'warning',
    reserved: 'info',
    booked: 'success',
    agreement: 'success',
    registered: 'success',
    expired: 'muted',
    cancelled: 'muted',
  },
  transitions: {
    hold: ['pending_approval', 'reserved', 'cancelled', 'expired'],
    pending_approval: ['hold', 'reserved', 'cancelled', 'expired'],
    reserved: ['booked', 'cancelled'],
    booked: ['agreement', 'cancelled'],
    agreement: ['registered', 'cancelled'],
    registered: [],
    expired: [],
    cancelled: [],
  },
  immutable: ['registered', 'expired', 'cancelled'],
});
