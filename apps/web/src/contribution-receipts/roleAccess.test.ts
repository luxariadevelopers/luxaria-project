import { describe, expect, it } from 'vitest';
import { resolveContributionReceiptCapabilities } from './roleAccess';

describe('resolveContributionReceiptCapabilities', () => {
  it('maps Nest contribution_receipt.* codes', () => {
    const caps = resolveContributionReceiptCapabilities((code) =>
      [
        'contribution_receipt.view',
        'contribution_receipt.create',
        'contribution_receipt.verify',
        'contribution_receipt.post',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canVerify).toBe(true);
    expect(caps.canPost).toBe(true);
    expect(caps.canSubmit).toBe(false);
    expect(caps.canCancel).toBe(false);
  });

  it('denies invented aliases', () => {
    const caps = resolveContributionReceiptCapabilities(
      (code) => code === 'receipt.view',
    );
    expect(caps.canView).toBe(false);
  });
});
