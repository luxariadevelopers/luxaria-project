import { describe, expect, it } from 'vitest';
import { resolveVendorInvoiceCapabilities } from './roleAccess';

describe('resolveVendorInvoiceCapabilities', () => {
  it('maps Nest codes (submit folds into create)', () => {
    const caps = resolveVendorInvoiceCapabilities((code) =>
      [
        'vendor_invoice.view',
        'vendor_invoice.create',
        'vendor_invoice.match',
        'vendor_invoice.approve',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canSubmit).toBe(true);
    expect(caps.canMatch).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canPost).toBe(false);
    expect(caps.canMarkPaid).toBe(false);
  });

  it('does not invent vendor_invoice.submit / exception aliases', () => {
    const caps = resolveVendorInvoiceCapabilities(
      (code) =>
        code === 'vendor_invoice.submit' || code === 'vendor_invoice.exception',
    );
    expect(caps.canSubmit).toBe(false);
    expect(caps.canApprove).toBe(false);
  });
});
