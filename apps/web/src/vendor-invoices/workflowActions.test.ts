import { describe, expect, it } from 'vitest';
import { resolveVendorInvoiceCapabilities } from './roleAccess';
import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from './types';
import {
  isInvoicePayableForPayment,
  resolveVendorInvoiceActions,
} from './workflowActions';

const allCaps = resolveVendorInvoiceCapabilities(() => true);

describe('resolveVendorInvoiceActions', () => {
  it('allows submit on draft with create', () => {
    const actions = resolveVendorInvoiceActions(
      {
        status: VendorInvoiceStatus.Draft,
        matchingStatus: VendorInvoiceMatchingStatus.Pending,
        exceptionApproved: false,
      },
      allCaps,
    );
    expect(actions).toContain('submit');
    expect(actions).toContain('edit');
  });

  it('allows match from verification', () => {
    const actions = resolveVendorInvoiceActions(
      {
        status: VendorInvoiceStatus.Verification,
        matchingStatus: VendorInvoiceMatchingStatus.Pending,
        exceptionApproved: false,
      },
      allCaps,
    );
    expect(actions).toContain('match');
  });

  it('requires exception approval path before payment', () => {
    expect(
      isInvoicePayableForPayment({
        status: VendorInvoiceStatus.Posted,
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        exceptionApproved: false,
      }).ok,
    ).toBe(false);
    expect(
      isInvoicePayableForPayment({
        status: VendorInvoiceStatus.Posted,
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        exceptionApproved: true,
      }).ok,
    ).toBe(true);
    expect(
      isInvoicePayableForPayment({
        status: VendorInvoiceStatus.Posted,
        matchingStatus: VendorInvoiceMatchingStatus.Matched,
        exceptionApproved: false,
      }).ok,
    ).toBe(true);
  });
});
