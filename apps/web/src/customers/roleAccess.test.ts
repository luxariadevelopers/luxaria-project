import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_DETAIL_TAB_DEFS,
  filterCustomerDetailTabs,
  resolveCustomerCapabilities,
} from './roleAccess';

describe('resolveCustomerCapabilities', () => {
  it('denies all without permissions', () => {
    const caps = resolveCustomerCapabilities(() => false);
    expect(caps).toEqual({
      canView: false,
      canCreate: false,
      canUpdate: false,
      canVerifyKyc: false,
      canActivate: false,
      canUploadDocument: false,
      canViewSensitive: false,
      canViewBookings: false,
      canViewReceipts: false,
      canViewLedger: false,
    });
  });

  it('maps create/update/view_sensitive aliases to customer.manage', () => {
    const caps = resolveCustomerCapabilities(
      (code) => code === 'customer.view' || code === 'customer.manage',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canUpdate).toBe(true);
    expect(caps.canVerifyKyc).toBe(true);
    expect(caps.canViewSensitive).toBe(true);
  });

  it('allows profile tabs with customer.view only', () => {
    const caps = resolveCustomerCapabilities(
      (code) => code === 'customer.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(false);
    expect(caps.canViewSensitive).toBe(false);
    expect(caps.canViewBookings).toBe(false);
    expect(caps.canViewReceipts).toBe(false);
    expect(caps.canViewLedger).toBe(false);
  });
});

describe('filterCustomerDetailTabs — permission tabs', () => {
  it('shows only base tabs when related permissions are missing', () => {
    const visible = filterCustomerDetailTabs(
      (code) => code === 'customer.view',
    );
    expect(visible.map((t) => t.id)).toEqual([
      'overview',
      'joint',
      'documents',
      'kyc',
    ]);
  });

  it('includes bookings tab only with booking.view', () => {
    const visible = filterCustomerDetailTabs((code) =>
      ['customer.view', 'booking.view'].includes(code),
    );
    expect(visible.map((t) => t.id)).toContain('bookings');
    expect(visible.map((t) => t.id)).not.toContain('receipts');
    expect(visible.map((t) => t.id)).not.toContain('ledger');
  });

  it('includes receipts with collection.view and ledger with report.view', () => {
    const visible = filterCustomerDetailTabs((code) =>
      ['customer.view', 'collection.view', 'report.view'].includes(code),
    );
    const ids = visible.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['receipts', 'ledger']),
    );
    expect(ids).not.toContain('bookings');
  });

  it('shows all tabs when view + booking + collection + report are granted', () => {
    const visible = filterCustomerDetailTabs((code) =>
      [
        'customer.view',
        'booking.view',
        'collection.view',
        'report.view',
      ].includes(code),
    );
    expect(visible.map((t) => t.id)).toEqual(
      CUSTOMER_DETAIL_TAB_DEFS.map((t) => t.id),
    );
  });

  it('matches EntityDetailTabs filter semantics (omit when permission missing)', () => {
    const hasPermission = (code: string) => code === 'customer.view';
    const filtered = CUSTOMER_DETAIL_TAB_DEFS.filter(
      (tab) => !tab.permission || hasPermission(tab.permission),
    );
    expect(filterCustomerDetailTabs(hasPermission)).toEqual(filtered);
  });
});
