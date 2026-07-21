import { describe, expect, it } from 'vitest';
import { resolvePaymentScheduleCapabilities } from './roleAccess';

describe('resolvePaymentScheduleCapabilities', () => {
  it('maps Nest collection.* codes', () => {
    const caps = resolvePaymentScheduleCapabilities((code) =>
      [
        'collection.view',
        'collection.create',
        'collection.approve',
        'booking.view',
        'unit.view',
        'customer.view',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canViewBookings).toBe(true);
    expect(caps.canViewUnits).toBe(true);
    expect(caps.canViewCustomers).toBe(true);
  });

  it('denies approve without collection.approve', () => {
    const caps = resolvePaymentScheduleCapabilities((code) =>
      ['collection.view', 'collection.create'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canApprove).toBe(false);
  });
});
