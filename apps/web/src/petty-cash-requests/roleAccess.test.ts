import { describe, expect, it } from 'vitest';
import { resolvePettyCashRequestCapabilities } from './roleAccess';

describe('resolvePettyCashRequestCapabilities', () => {
  it('maps Nest petty_cash.* codes (not petty_cash_request.*)', () => {
    const caps = resolvePettyCashRequestCapabilities((code) =>
      [
        'petty_cash.view',
        'petty_cash.request',
        'petty_cash.approve',
        'petty_cash.fund',
        'cash.view',
      ].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canRequest: true,
      canApprove: true,
      canFund: true,
      canViewCash: true,
    });
  });

  it('denies when only prompt-alias codes are present', () => {
    const caps = resolvePettyCashRequestCapabilities((code) =>
      code.startsWith('petty_cash_request.'),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canRequest).toBe(false);
    expect(caps.canApprove).toBe(false);
    expect(caps.canFund).toBe(false);
  });
});
