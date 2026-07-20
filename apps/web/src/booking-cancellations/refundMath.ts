/**
 * Mirrors Nest `booking-cancellations.validation` money helpers.
 * approvedRefund = max(0, totalReceived − cancellationCharge − deductions)
 */

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type RefundBreakdownInput = {
  totalReceived: number;
  cancellationCharge: number;
  deductions: number;
};

export type RefundBreakdownResult =
  | {
      ok: true;
      totalReceived: number;
      cancellationCharge: number;
      deductions: number;
      approvedRefund: number;
    }
  | { ok: false; message: string };

export function computeApprovedRefund(
  input: RefundBreakdownInput,
): RefundBreakdownResult {
  const totalReceived = roundMoney(input.totalReceived);
  const cancellationCharge = roundMoney(input.cancellationCharge);
  const deductions = roundMoney(input.deductions);

  if (!Number.isFinite(totalReceived) || totalReceived < 0) {
    return { ok: false, message: 'totalReceived must be ≥ 0' };
  }
  if (!Number.isFinite(cancellationCharge) || cancellationCharge < 0) {
    return { ok: false, message: 'cancellationCharge must be ≥ 0' };
  }
  if (!Number.isFinite(deductions) || deductions < 0) {
    return { ok: false, message: 'deductions must be ≥ 0' };
  }

  const refund = roundMoney(totalReceived - cancellationCharge - deductions);
  if (refund < -0.009) {
    return {
      ok: false,
      message: 'cancellationCharge + deductions cannot exceed totalReceived',
    };
  }

  return {
    ok: true,
    totalReceived,
    cancellationCharge,
    deductions,
    approvedRefund: Math.max(0, refund),
  };
}

/**
 * Nest `releaseUnit` gate — unit is released only after the approved workflow:
 * - approvedRefund > 0 → status must be `refund_processed`
 * - approvedRefund === 0 → status may be `approved` (skip refund)
 * Never from requested/reviewed/pending/rejected.
 */
export function canReleaseUnit(input: {
  status: string;
  approvedRefund: number;
}): { ok: true } | { ok: false; message: string } {
  const refund = roundMoney(input.approvedRefund);
  if (refund > 0) {
    if (input.status !== 'refund_processed') {
      return {
        ok: false,
        message:
          'Unit can be released only after refund is processed when approvedRefund > 0',
      };
    }
    return { ok: true };
  }
  if (input.status !== 'approved') {
    return {
      ok: false,
      message: 'Unit can be released only after cancellation is approved',
    };
  }
  return { ok: true };
}

/** Refund posting is only allowed on approved rows with a positive refund. */
export function canProcessRefund(input: {
  status: string;
  approvedRefund: number;
}): { ok: true } | { ok: false; message: string } {
  if (input.status !== 'approved') {
    return {
      ok: false,
      message: 'Only approved cancellations can process refunds',
    };
  }
  if (roundMoney(input.approvedRefund) <= 0) {
    return {
      ok: false,
      message:
        'No refund due — use release-unit directly when approvedRefund is zero',
    };
  }
  return { ok: true };
}
