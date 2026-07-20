import { describe, expect, it } from 'vitest';
import { resolveBoqCapabilities } from './roleAccess';

describe('resolveBoqCapabilities', () => {
  it('maps Nest boq.view / manage / approve codes', () => {
    const caps = resolveBoqCapabilities((code) =>
      ['boq.view', 'boq.manage', 'boq.approve'].includes(code),
    );
    expect(caps).toEqual({
      canView: true,
      canManage: true,
      canImport: true,
      canApprove: true,
    });
  });

  it('maps import to boq.manage (no boq.import alias)', () => {
    const caps = resolveBoqCapabilities((code) => code === 'boq.manage');
    expect(caps.canImport).toBe(true);
    expect(caps.canManage).toBe(true);
    expect(caps.canView).toBe(false);
  });

  it('does not treat prompt aliases as permissions', () => {
    const caps = resolveBoqCapabilities((code) =>
      ['boq.create', 'boq.update', 'boq_version.view', 'boq.import'].includes(
        code,
      ),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canManage).toBe(false);
    expect(caps.canImport).toBe(false);
    expect(caps.canApprove).toBe(false);
  });
});
