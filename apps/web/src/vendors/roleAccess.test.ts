import { describe, expect, it } from 'vitest';
import { resolveVendorCapabilities } from './roleAccess';

describe('resolveVendorCapabilities', () => {
  it('maps create/update/block aliases to vendor.manage', () => {
    const caps = resolveVendorCapabilities(
      (code) => code === 'vendor.view' || code === 'vendor.manage',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canUpdate).toBe(true);
    expect(caps.canBlock).toBe(true);
    expect(caps.canActivate).toBe(true);
    expect(caps.canVerify).toBe(true);
  });

  it('does not honour non-catalog vendor.create / vendor.block codes', () => {
    const caps = resolveVendorCapabilities((code) =>
      ['vendor.view', 'vendor.create', 'vendor.update', 'vendor.block'].includes(
        code,
      ),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(false);
    expect(caps.canUpdate).toBe(false);
    expect(caps.canBlock).toBe(false);
  });

  it('denies manage actions with only vendor.view', () => {
    const caps = resolveVendorCapabilities((code) => code === 'vendor.view');
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(false);
    expect(caps.canBlock).toBe(false);
    expect(caps.canActivate).toBe(false);
    expect(caps.canVerify).toBe(false);
  });
});
