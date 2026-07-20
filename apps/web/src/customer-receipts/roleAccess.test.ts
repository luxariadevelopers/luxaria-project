import { describe, expect, it } from 'vitest';
import { resolveCustomerReceiptCapabilities } from './roleAccess';

describe('resolveCustomerReceiptCapabilities', () => {
  it('maps Nest collection.* codes (not customer_receipt.* aliases)', () => {
    const caps = resolveCustomerReceiptCapabilities((code) =>
      [
        'collection.view',
        'collection.create',
        'collection.approve',
        'bank.view',
        'booking.view',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canPost).toBe(true);
    expect(caps.canCancel).toBe(true);
    expect(caps.canViewBankAccounts).toBe(true);
    expect(caps.canViewBookings).toBe(true);
  });

  it('denies post without collection.approve', () => {
    const caps = resolveCustomerReceiptCapabilities((code) =>
      ['collection.view', 'collection.create'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canPost).toBe(false);
  });
});
