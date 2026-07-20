import { describe, expect, it } from 'vitest';
import { resolveBookingCapabilities } from './roleAccess';

describe('resolveBookingCapabilities', () => {
  it('maps Nest booking.* codes', () => {
    const caps = resolveBookingCapabilities((code) =>
      ['booking.view', 'booking.create', 'booking.approve'].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canCreate: true,
      canApprove: true,
    });
  });

  it('denies when catalog permissions are absent', () => {
    const caps = resolveBookingCapabilities(() => false);
    expect(caps.canView).toBe(false);
    expect(caps.canCreate).toBe(false);
    expect(caps.canApprove).toBe(false);
  });
});
