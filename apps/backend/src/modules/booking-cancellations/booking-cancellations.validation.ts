import { BadRequestException } from '@nestjs/common';
import { BookingCancellationStatus } from './schemas/booking-cancellation.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

export function computeApprovedRefund(input: {
  totalReceived: number;
  cancellationCharge: number;
  deductions: number;
}): number {
  assertNonNegative(input.totalReceived, 'totalReceived');
  assertNonNegative(input.cancellationCharge, 'cancellationCharge');
  assertNonNegative(input.deductions, 'deductions');

  const refund = roundMoney(
    input.totalReceived - input.cancellationCharge - input.deductions,
  );
  if (refund < -0.009) {
    throw new BadRequestException(
      'cancellationCharge + deductions cannot exceed totalReceived',
    );
  }
  return Math.max(0, refund);
}

export function normalizeRefundTransactionId(
  value?: string | null,
): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length < 3) {
    throw new BadRequestException(
      'refundTransactionId must be at least 3 characters',
    );
  }
  return normalized;
}

const ALLOWED: Record<BookingCancellationStatus, BookingCancellationStatus[]> =
  {
    [BookingCancellationStatus.Requested]: [
      BookingCancellationStatus.Reviewed,
      BookingCancellationStatus.Cancelled,
      BookingCancellationStatus.Rejected,
    ],
    [BookingCancellationStatus.Reviewed]: [
      BookingCancellationStatus.PendingApproval,
      BookingCancellationStatus.Approved,
      BookingCancellationStatus.Cancelled,
      BookingCancellationStatus.Rejected,
    ],
    [BookingCancellationStatus.PendingApproval]: [
      BookingCancellationStatus.Approved,
      BookingCancellationStatus.Rejected,
      BookingCancellationStatus.Cancelled,
    ],
    [BookingCancellationStatus.Approved]: [
      BookingCancellationStatus.RefundProcessed,
      BookingCancellationStatus.UnitReleased, // when approvedRefund === 0
    ],
    [BookingCancellationStatus.RefundProcessed]: [
      BookingCancellationStatus.UnitReleased,
    ],
    [BookingCancellationStatus.UnitReleased]: [],
    [BookingCancellationStatus.Rejected]: [],
    [BookingCancellationStatus.Cancelled]: [],
  };

export function assertCancellationTransition(
  from: BookingCancellationStatus,
  to: BookingCancellationStatus,
): void {
  if (from === to) return;
  const allowed = ALLOWED[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid cancellation transition from "${from}" to "${to}"`,
    );
  }
}
