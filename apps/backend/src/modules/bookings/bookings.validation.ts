import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from './schemas/booking.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

export function computeApprovedPrice(
  agreedPrice: number,
  discount: number,
): number {
  return roundMoney(agreedPrice - discount);
}

export function assertPriceConsistency(input: {
  agreedPrice: number;
  discount: number;
  approvedPrice: number;
}): void {
  assertNonNegative(input.agreedPrice, 'agreedPrice');
  assertNonNegative(input.discount, 'discount');
  assertNonNegative(input.approvedPrice, 'approvedPrice');

  if (input.discount > input.agreedPrice) {
    throw new BadRequestException('discount cannot exceed agreedPrice');
  }

  const expected = computeApprovedPrice(input.agreedPrice, input.discount);
  if (Math.abs(expected - input.approvedPrice) > 0.009) {
    throw new BadRequestException(
      `approvedPrice must equal agreedPrice − discount (${expected})`,
    );
  }
}

export function discountPercentOf(
  discount: number,
  agreedPrice: number,
): number {
  if (agreedPrice <= 0) return 0;
  return roundMoney((discount / agreedPrice) * 100);
}

/**
 * True when discount exceeds configured percent OR absolute amount limits.
 */
export function discountRequiresApproval(input: {
  discount: number;
  agreedPrice: number;
  percentLimit: number;
  amountLimit: number;
}): boolean {
  if (input.discount <= 0) return false;
  const percent = discountPercentOf(input.discount, input.agreedPrice);
  if (percent > input.percentLimit) return true;
  if (input.amountLimit > 0 && input.discount > input.amountLimit) return true;
  return false;
}

const ALLOWED_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.Hold]: [
    BookingStatus.PendingApproval,
    BookingStatus.Reserved,
    BookingStatus.Cancelled,
    BookingStatus.Expired,
  ],
  [BookingStatus.PendingApproval]: [
    BookingStatus.Hold,
    BookingStatus.Reserved,
    BookingStatus.Cancelled,
    BookingStatus.Expired,
  ],
  [BookingStatus.Reserved]: [
    BookingStatus.Booked,
    BookingStatus.Cancelled,
  ],
  [BookingStatus.Booked]: [
    BookingStatus.Agreement,
    BookingStatus.Cancelled,
  ],
  [BookingStatus.Agreement]: [
    BookingStatus.Registered,
    BookingStatus.Cancelled,
  ],
  [BookingStatus.Registered]: [],
  [BookingStatus.Expired]: [],
  [BookingStatus.Cancelled]: [],
};

export function assertBookingStatusTransition(
  from: BookingStatus,
  to: BookingStatus,
): void {
  if (from === to) return;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid booking status transition from "${from}" to "${to}"`,
    );
  }
}

/** Workflow progression targets (excludes cancel/expire/approval side-paths). */
export const WORKFLOW_PROGRESSION: BookingStatus[] = [
  BookingStatus.Hold,
  BookingStatus.Reserved,
  BookingStatus.Booked,
  BookingStatus.Agreement,
  BookingStatus.Registered,
];
