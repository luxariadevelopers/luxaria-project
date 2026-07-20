import { describe, expect, it } from 'vitest';
import { resolveVendorPaymentCapabilities } from './roleAccess';

describe('resolveVendorPaymentCapabilities', () => {
  it('maps Nest payment.* codes (not vendor_payment.* aliases)', () => {
    const caps = resolveVendorPaymentCapabilities((code) =>
      ['payment.view', 'payment.release', 'payment.approve'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canSubmit).toBe(true);
    expect(caps.canBankRelease).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canPost).toBe(true);
  });

  it('ignores prompt aliases vendor_payment.create/post', () => {
    const caps = resolveVendorPaymentCapabilities((code) =>
      code.startsWith('vendor_payment.'),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canCreate).toBe(false);
    expect(caps.canPost).toBe(false);
  });
});
