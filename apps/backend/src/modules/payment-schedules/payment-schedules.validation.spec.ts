import { BadRequestException } from '@nestjs/common';
import {
  assertScheduleLines,
  canGenerateDemand,
  canMarkDue,
  isLineOverdue,
} from './payment-schedules.validation';
import {
  PaymentScheduleLineStatus,
  PaymentScheduleType,
} from './schemas/payment-schedule.schema';

describe('payment-schedules.validation', () => {
  const baseLines = [
    {
      sequence: 1,
      milestone: 'Booking',
      dueDate: '2026-08-01',
      percentage: 10,
      amount: 100_000,
      tax: 5_000,
    },
    {
      sequence: 2,
      milestone: 'Possession',
      dueDate: '2026-12-01',
      percentage: 90,
      amount: 900_000,
      tax: 45_000,
    },
  ];

  it('requires amounts to equal totalAmount and percentages to total 100', () => {
    expect(() =>
      assertScheduleLines(
        PaymentScheduleType.DateBased,
        baseLines,
        1_000_000,
      ),
    ).not.toThrow();

    expect(() =>
      assertScheduleLines(
        PaymentScheduleType.DateBased,
        baseLines,
        999_000,
      ),
    ).toThrow(BadRequestException);
  });

  it('requires dueDate for date_based schedules', () => {
    expect(() =>
      assertScheduleLines(
        PaymentScheduleType.DateBased,
        [
          {
            sequence: 1,
            milestone: 'Only',
            dueDate: null,
            percentage: 100,
            amount: 1_000_000,
          },
        ],
        1_000_000,
      ),
    ).toThrow(BadRequestException);
  });

  it('allows construction milestones without dueDate', () => {
    expect(() =>
      assertScheduleLines(
        PaymentScheduleType.ConstructionMilestone,
        [
          {
            sequence: 1,
            milestone: 'Foundation',
            percentage: 40,
            amount: 400_000,
          },
          {
            sequence: 2,
            milestone: 'Roof',
            percentage: 60,
            amount: 600_000,
          },
        ],
        1_000_000,
      ),
    ).not.toThrow();
  });

  it('detects overdue lines', () => {
    expect(
      isLineOverdue({
        status: PaymentScheduleLineStatus.Due,
        dueDate: new Date('2020-01-01'),
        asOf: new Date('2026-07-20'),
      }),
    ).toBe(true);
    expect(
      isLineOverdue({
        status: PaymentScheduleLineStatus.Paid,
        dueDate: new Date('2020-01-01'),
        asOf: new Date('2026-07-20'),
      }),
    ).toBe(false);
  });

  it('gates mark-due and demand generation by line status', () => {
    expect(canMarkDue(PaymentScheduleLineStatus.Pending)).toBe(true);
    expect(canMarkDue(PaymentScheduleLineStatus.Demanded)).toBe(false);
    expect(canGenerateDemand(PaymentScheduleLineStatus.Due)).toBe(true);
    expect(canGenerateDemand(PaymentScheduleLineStatus.Paid)).toBe(false);
  });
});
