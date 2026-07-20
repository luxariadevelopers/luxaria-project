import { describe, expect, it } from 'vitest';
import {
  VENDOR_DETAIL_TAB_DEFS,
  filterVendorDetailTabs,
  resolveVendorCapabilities,
} from './roleAccess';

describe('resolveVendorCapabilities', () => {
  it('denies all without permissions', () => {
    const caps = resolveVendorCapabilities(() => false);
    expect(caps).toEqual({
      canView: false,
      canCreate: false,
      canUpdate: false,
      canBlock: false,
      canActivate: false,
      canVerify: false,
      canManage: false,
      canViewInvoices: false,
      canViewPayments: false,
      canViewLedger: false,
      canViewQuality: false,
    });
  });

  it('allows profile tabs with vendor.view only', () => {
    const caps = resolveVendorCapabilities(
      (code) => code === 'vendor.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canViewInvoices).toBe(false);
    expect(caps.canViewPayments).toBe(false);
    expect(caps.canViewLedger).toBe(false);
  });

  it('requires payment.view for finance ledger/payment tabs', () => {
    const caps = resolveVendorCapabilities((code) =>
      ['vendor.view', 'payment.view'].includes(code),
    );
    expect(caps.canViewPayments).toBe(true);
    expect(caps.canViewLedger).toBe(true);
    expect(caps.canViewInvoices).toBe(false);
  });

  it('separates invoice permission from payments', () => {
    const caps = resolveVendorCapabilities((code) =>
      ['vendor.view', 'vendor_invoice.view'].includes(code),
    );
    expect(caps.canViewInvoices).toBe(true);
    expect(caps.canViewPayments).toBe(false);
    expect(caps.canViewLedger).toBe(false);
  });
});

describe('filterVendorDetailTabs', () => {
  it('shows only vendor.view tabs when finance permissions are missing', () => {
    const visible = filterVendorDetailTabs((code) => code === 'vendor.view');
    expect(visible.map((t) => t.id)).toEqual([
      'overview',
      'bank',
      'documents',
      'projects',
      'performance',
    ]);
  });

  it('includes invoice tab only with vendor_invoice.view', () => {
    const visible = filterVendorDetailTabs((code) =>
      ['vendor.view', 'vendor_invoice.view'].includes(code),
    );
    expect(visible.map((t) => t.id)).toContain('invoices');
    expect(visible.map((t) => t.id)).not.toContain('payments');
    expect(visible.map((t) => t.id)).not.toContain('ledger');
    expect(visible.map((t) => t.id)).not.toContain('payable');
  });

  it('includes payable, payments, and ledger with payment.view', () => {
    const visible = filterVendorDetailTabs((code) =>
      ['vendor.view', 'payment.view'].includes(code),
    );
    const ids = visible.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['payable', 'payments', 'ledger']),
    );
    expect(ids).not.toContain('invoices');
  });

  it('shows all tabs when view + invoice + payment are granted', () => {
    const visible = filterVendorDetailTabs((code) =>
      ['vendor.view', 'vendor_invoice.view', 'payment.view'].includes(code),
    );
    expect(visible.map((t) => t.id)).toEqual(
      VENDOR_DETAIL_TAB_DEFS.map((t) => t.id),
    );
  });

  it('matches EntityDetailTabs filter semantics (omit when permission missing)', () => {
    const hasPermission = (code: string) => code === 'vendor.view';
    const filtered = VENDOR_DETAIL_TAB_DEFS.filter(
      (tab) => !tab.permission || hasPermission(tab.permission),
    );
    expect(filterVendorDetailTabs(hasPermission)).toEqual(filtered);
  });
});
