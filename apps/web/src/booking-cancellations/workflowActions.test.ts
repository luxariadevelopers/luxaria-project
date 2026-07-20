import { describe, expect, it } from 'vitest';
import type { BookingCancellationCapabilities } from './roleAccess';
import { BookingCancellationStatus } from './types';
import { resolveCancellationActions } from './workflowActions';

const fullCaps: BookingCancellationCapabilities = {
  canView: true,
  canRequest: true,
  canReview: true,
  canSubmitApproval: true,
  canReleaseUnit: true,
  canAttachDocument: true,
  canApprove: true,
  canReject: true,
  canRefund: true,
  canViewBankAccounts: true,
};

describe('resolveCancellationActions', () => {
  it('never offers release_unit on requested/reviewed (no double availability)', () => {
    expect(
      resolveCancellationActions(
        { status: BookingCancellationStatus.Requested, approvedRefund: 0 },
        fullCaps,
      ),
    ).not.toContain('release_unit');

    expect(
      resolveCancellationActions(
        { status: BookingCancellationStatus.Reviewed, approvedRefund: 50_000 },
        fullCaps,
      ),
    ).not.toContain('release_unit');
  });

  it('offers process_refund only after approval with positive refund', () => {
    expect(
      resolveCancellationActions(
        { status: BookingCancellationStatus.Approved, approvedRefund: 12_000 },
        fullCaps,
      ),
    ).toContain('process_refund');

    expect(
      resolveCancellationActions(
        { status: BookingCancellationStatus.Reviewed, approvedRefund: 12_000 },
        fullCaps,
      ),
    ).not.toContain('process_refund');

    expect(
      resolveCancellationActions(
        { status: BookingCancellationStatus.Approved, approvedRefund: 0 },
        fullCaps,
      ),
    ).not.toContain('process_refund');
  });

  it('offers release_unit after refund when money is due', () => {
    expect(
      resolveCancellationActions(
        {
          status: BookingCancellationStatus.RefundProcessed,
          approvedRefund: 12_000,
        },
        fullCaps,
      ),
    ).toContain('release_unit');
  });

  it('respects collection.refund permission for refund action', () => {
    const noRefund: BookingCancellationCapabilities = {
      ...fullCaps,
      canRefund: false,
    };
    expect(
      resolveCancellationActions(
        { status: BookingCancellationStatus.Approved, approvedRefund: 12_000 },
        noRefund,
      ),
    ).not.toContain('process_refund');
  });
});
