import { describe, expect, it } from 'vitest';
import { BookingStatus } from '@/status';
import { resolveBookingCapabilities } from './roleAccess';
import type { PublicBooking } from './types';
import {
  canApproveBookingDiscount,
  canCancelBooking,
  canTransitionBookingTo,
  resolveBookingDetailActions,
} from './workflowActions';

function booking(
  partial: Partial<PublicBooking> & Pick<PublicBooking, 'status'>,
): Pick<
  PublicBooking,
  'status' | 'discountApprovalRequired' | 'discountApproved'
> {
  return {
    discountApprovalRequired: false,
    discountApproved: false,
    ...partial,
  };
}

const allCaps = resolveBookingCapabilities((code) =>
  ['booking.view', 'booking.create', 'booking.approve'].includes(code),
);

const viewOnly = resolveBookingCapabilities((code) => code === 'booking.view');

describe('booking workflow actions', () => {
  it('offers discount approval on pending_approval when canApprove', () => {
    const row = booking({ status: BookingStatus.PendingApproval });
    expect(canApproveBookingDiscount(row, allCaps)).toBe(true);
    expect(resolveBookingDetailActions(row, allCaps)).toEqual([
      'approve_discount',
      'reject_discount',
      'cancel',
    ]);
  });

  it('allows hold → reserved when discount is cleared', () => {
    const row = booking({
      status: BookingStatus.Hold,
      discountApprovalRequired: true,
      discountApproved: true,
    });
    expect(
      canTransitionBookingTo(row, BookingStatus.Reserved, allCaps),
    ).toBe(true);
    expect(resolveBookingDetailActions(row, allCaps)).toContain(
      'transition_reserved',
    );
  });

  it('blocks reserved transition when discount approval pending', () => {
    const row = booking({
      status: BookingStatus.Hold,
      discountApprovalRequired: true,
      discountApproved: false,
    });
    expect(
      canTransitionBookingTo(row, BookingStatus.Reserved, allCaps),
    ).toBe(false);
  });

  it('progresses reserved → booked → agreement → registered', () => {
    expect(
      resolveBookingDetailActions(
        booking({ status: BookingStatus.Reserved }),
        allCaps,
      ),
    ).toEqual(['transition_booked', 'cancel']);

    expect(
      resolveBookingDetailActions(
        booking({ status: BookingStatus.Booked }),
        allCaps,
      ),
    ).toEqual(['transition_agreement']);

    expect(
      resolveBookingDetailActions(
        booking({ status: BookingStatus.Agreement }),
        allCaps,
      ),
    ).toEqual(['transition_registered']);
  });

  it('allows cancel on hold, pending approval, and reserved', () => {
    for (const status of [
      BookingStatus.Hold,
      BookingStatus.PendingApproval,
      BookingStatus.Reserved,
    ] as const) {
      expect(canCancelBooking(booking({ status }), allCaps)).toBe(true);
    }
    expect(
      canCancelBooking(booking({ status: BookingStatus.Booked }), allCaps),
    ).toBe(false);
  });

  it('returns no mutations for view-only caps', () => {
    expect(
      resolveBookingDetailActions(
        booking({ status: BookingStatus.Hold }),
        viewOnly,
      ),
    ).toEqual([]);
  });
});
