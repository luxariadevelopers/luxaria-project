import { BadRequestException } from '@nestjs/common';
import {
  assertBookingStatusTransition,
  assertPriceConsistency,
  discountRequiresApproval,
} from './bookings.validation';
import { BookingStatus } from './schemas/booking.schema';

describe('bookings.validation', () => {
  it('enforces Hold → Reserved → Booked → Agreement → Registered', () => {
    expect(() =>
      assertBookingStatusTransition(BookingStatus.Hold, BookingStatus.Reserved),
    ).not.toThrow();
    expect(() =>
      assertBookingStatusTransition(
        BookingStatus.Reserved,
        BookingStatus.Booked,
      ),
    ).not.toThrow();
    expect(() =>
      assertBookingStatusTransition(
        BookingStatus.Booked,
        BookingStatus.Agreement,
      ),
    ).not.toThrow();
    expect(() =>
      assertBookingStatusTransition(
        BookingStatus.Agreement,
        BookingStatus.Registered,
      ),
    ).not.toThrow();
    expect(() =>
      assertBookingStatusTransition(
        BookingStatus.Hold,
        BookingStatus.Booked,
      ),
    ).toThrow(BadRequestException);
  });

  it('validates approvedPrice = agreedPrice − discount', () => {
    expect(() =>
      assertPriceConsistency({
        agreedPrice: 1000,
        discount: 100,
        approvedPrice: 900,
      }),
    ).not.toThrow();
    expect(() =>
      assertPriceConsistency({
        agreedPrice: 1000,
        discount: 100,
        approvedPrice: 950,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertPriceConsistency({
        agreedPrice: 1000,
        discount: 1100,
        approvedPrice: -100,
      }),
    ).toThrow(BadRequestException);
  });

  it('flags discounts above percent or amount limits', () => {
    expect(
      discountRequiresApproval({
        discount: 400_000,
        agreedPrice: 10_000_000,
        percentLimit: 5,
        amountLimit: 500_000,
      }),
    ).toBe(false);

    expect(
      discountRequiresApproval({
        discount: 600_000,
        agreedPrice: 10_000_000,
        percentLimit: 5,
        amountLimit: 500_000,
      }),
    ).toBe(true);

    expect(
      discountRequiresApproval({
        discount: 600_000,
        agreedPrice: 10_000_000,
        percentLimit: 5,
        amountLimit: 1_000_000,
      }),
    ).toBe(true); // 6% > 5%
  });
});
