import { describe, expect, it } from 'vitest';
import {
  canProcessRefund,
  canReleaseUnit,
  computeApprovedRefund,
} from './refundMath';

describe('computeApprovedRefund', () => {
  it('computes approvedRefund = totalReceived − charge − deductions', () => {
    const result = computeApprovedRefund({
      totalReceived: 500_000,
      cancellationCharge: 50_000,
      deductions: 25_000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.approvedRefund).toBe(425_000);
    }
  });

  it('rejects charges exceeding totalReceived (no unapproved over-refund)', () => {
    const result = computeApprovedRefund({
      totalReceived: 100_000,
      cancellationCharge: 80_000,
      deductions: 30_000,
    });
    expect(result.ok).toBe(false);
  });

  it('allows zero refund when charges consume receipts', () => {
    const result = computeApprovedRefund({
      totalReceived: 100_000,
      cancellationCharge: 60_000,
      deductions: 40_000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.approvedRefund).toBe(0);
    }
  });
});

describe('canReleaseUnit — no double availability', () => {
  it('blocks release before approval when no refund is due', () => {
    expect(
      canReleaseUnit({ status: 'requested', approvedRefund: 0 }).ok,
    ).toBe(false);
    expect(
      canReleaseUnit({ status: 'reviewed', approvedRefund: 0 }).ok,
    ).toBe(false);
    expect(
      canReleaseUnit({ status: 'pending_approval', approvedRefund: 0 }).ok,
    ).toBe(false);
  });

  it('allows Approved → UnitReleased only when approvedRefund is zero', () => {
    expect(
      canReleaseUnit({ status: 'approved', approvedRefund: 0 }).ok,
    ).toBe(true);
    expect(
      canReleaseUnit({ status: 'approved', approvedRefund: 10_000 }).ok,
    ).toBe(false);
  });

  it('requires refund_processed before release when refund is due', () => {
    expect(
      canReleaseUnit({
        status: 'refund_processed',
        approvedRefund: 25_000,
      }).ok,
    ).toBe(true);
    expect(
      canReleaseUnit({ status: 'approved', approvedRefund: 25_000 }).ok,
    ).toBe(false);
    expect(
      canReleaseUnit({ status: 'requested', approvedRefund: 25_000 }).ok,
    ).toBe(false);
  });
});

describe('canProcessRefund — no unapproved refunds', () => {
  it('allows refund only on approved status with positive amount', () => {
    expect(
      canProcessRefund({ status: 'approved', approvedRefund: 1_000 }).ok,
    ).toBe(true);
  });

  it('blocks refund on unapproved statuses', () => {
    for (const status of [
      'requested',
      'reviewed',
      'pending_approval',
      'refund_processed',
      'unit_released',
      'rejected',
    ]) {
      expect(
        canProcessRefund({ status, approvedRefund: 1_000 }).ok,
      ).toBe(false);
    }
  });

  it('blocks refund when approvedRefund is zero', () => {
    expect(
      canProcessRefund({ status: 'approved', approvedRefund: 0 }).ok,
    ).toBe(false);
  });
});
