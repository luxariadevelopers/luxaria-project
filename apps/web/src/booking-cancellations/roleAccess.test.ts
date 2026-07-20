import { describe, expect, it } from 'vitest';
import { resolveBookingCancellationCapabilities } from './roleAccess';

describe('resolveBookingCancellationCapabilities', () => {
  it('maps Nest catalog codes (not booking_cancel.* aliases)', () => {
    const caps = resolveBookingCancellationCapabilities((code) =>
      [
        'booking.view',
        'booking.cancel',
        'booking.approve',
        'collection.refund',
        'bank.view',
      ].includes(code),
    );

    expect(caps.canView).toBe(true);
    expect(caps.canRequest).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canRefund).toBe(true);
    expect(caps.canViewBankAccounts).toBe(true);
  });

  it('denies when catalog permissions are missing', () => {
    const caps = resolveBookingCancellationCapabilities(() => false);
    expect(caps.canView).toBe(false);
    expect(caps.canRequest).toBe(false);
    expect(caps.canRefund).toBe(false);
  });
});
