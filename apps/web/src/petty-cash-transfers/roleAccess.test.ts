import { describe, expect, it } from 'vitest';
import { resolvePettyCashTransferCapabilities } from './roleAccess';

describe('resolvePettyCashTransferCapabilities', () => {
  it('maps Nest petty_cash.view / petty_cash.fund', () => {
    const caps = resolvePettyCashTransferCapabilities((code) =>
      ['petty_cash.view', 'petty_cash.fund', 'bank.view'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canVerify).toBe(true);
    expect(caps.canPost).toBe(true);
    expect(caps.canCancel).toBe(true);
    expect(caps.canViewBankAccounts).toBe(true);
  });

  it('does not invent petty_cash_transfer.* aliases', () => {
    const caps = resolvePettyCashTransferCapabilities(
      (code) => code === 'petty_cash_transfer.create',
    );
    expect(caps.canView).toBe(false);
    expect(caps.canCreate).toBe(false);
    expect(caps.canPost).toBe(false);
  });
});
