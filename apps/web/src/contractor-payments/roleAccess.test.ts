import { describe, expect, it } from 'vitest';
import { resolveContractorPaymentCapabilities } from './roleAccess';

describe('resolveContractorPaymentCapabilities', () => {
  it('maps Nest payment.* codes (not contractor_payment.* aliases)', () => {
    const caps = resolveContractorPaymentCapabilities((code) =>
      ['payment.view', 'payment.release', 'payment.approve'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canSubmit).toBe(true);
    expect(caps.canBankRelease).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canPost).toBe(true);
  });

  it('ignores prompt aliases contractor_payment.create/post', () => {
    const caps = resolveContractorPaymentCapabilities((code) =>
      code.startsWith('contractor_payment.'),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canCreate).toBe(false);
    expect(caps.canPost).toBe(false);
  });
});
