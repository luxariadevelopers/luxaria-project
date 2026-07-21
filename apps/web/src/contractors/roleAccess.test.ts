import { describe, expect, it } from 'vitest';
import { resolveContractorCapabilities } from './roleAccess';

describe('resolveContractorCapabilities', () => {
  it('requires contractor.view for list access', () => {
    const caps = resolveContractorCapabilities(
      (code) => code === 'contractor.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(false);
  });

  it('maps contractor.manage to create/update/verify/activate/block', () => {
    const caps = resolveContractorCapabilities((code) =>
      ['contractor.view', 'contractor.manage'].includes(code),
    );
    expect(caps.canCreate).toBe(true);
    expect(caps.canUpdate).toBe(true);
    expect(caps.canVerify).toBe(true);
    expect(caps.canActivate).toBe(true);
    expect(caps.canBlock).toBe(true);
  });
});
