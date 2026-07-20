import { describe, expect, it } from 'vitest';
import { resolveVendorPaymentCapabilities } from './roleAccess';
import { VendorPaymentStatus } from './types';
import { resolveVendorPaymentActions } from './workflowActions';

const allCaps = resolveVendorPaymentCapabilities(() => true);

describe('resolveVendorPaymentActions', () => {
  it('allows submit on draft', () => {
    expect(
      resolveVendorPaymentActions(
        { status: VendorPaymentStatus.Draft },
        allCaps,
      ),
    ).toContain('submit');
  });

  it('allows approve on approval status', () => {
    expect(
      resolveVendorPaymentActions(
        { status: VendorPaymentStatus.Approval },
        allCaps,
      ),
    ).toContain('approve');
  });

  it('allows release + verify on released', () => {
    const actions = resolveVendorPaymentActions(
      { status: VendorPaymentStatus.Released },
      allCaps,
    );
    expect(actions).toContain('release');
    expect(actions).toContain('verify');
  });

  it('allows post on verified', () => {
    expect(
      resolveVendorPaymentActions(
        { status: VendorPaymentStatus.Verified },
        allCaps,
      ),
    ).toContain('post');
  });
});
