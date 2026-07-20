import { BadRequestException } from '@nestjs/common';
import {
  assertCancellationTransition,
  computeApprovedRefund,
} from './booking-cancellations.validation';
import { BookingCancellationStatus } from './schemas/booking-cancellation.schema';

describe('booking-cancellations.validation', () => {
  it('computes approvedRefund = totalReceived − charge − deductions', () => {
    expect(
      computeApprovedRefund({
        totalReceived: 500_000,
        cancellationCharge: 50_000,
        deductions: 25_000,
      }),
    ).toBe(425_000);
  });

  it('rejects charges exceeding totalReceived', () => {
    expect(() =>
      computeApprovedRefund({
        totalReceived: 100_000,
        cancellationCharge: 80_000,
        deductions: 30_000,
      }),
    ).toThrow(BadRequestException);
  });

  it('enforces Requested → Reviewed → Approved → Refund Processed → Unit Released', () => {
    expect(() =>
      assertCancellationTransition(
        BookingCancellationStatus.Requested,
        BookingCancellationStatus.Reviewed,
      ),
    ).not.toThrow();
    expect(() =>
      assertCancellationTransition(
        BookingCancellationStatus.Approved,
        BookingCancellationStatus.RefundProcessed,
      ),
    ).not.toThrow();
    expect(() =>
      assertCancellationTransition(
        BookingCancellationStatus.RefundProcessed,
        BookingCancellationStatus.UnitReleased,
      ),
    ).not.toThrow();
    expect(() =>
      assertCancellationTransition(
        BookingCancellationStatus.Requested,
        BookingCancellationStatus.UnitReleased,
      ),
    ).toThrow(BadRequestException);
  });

  it('allows Approved → UnitReleased when no refund is due', () => {
    expect(() =>
      assertCancellationTransition(
        BookingCancellationStatus.Approved,
        BookingCancellationStatus.UnitReleased,
      ),
    ).not.toThrow();
  });
});
