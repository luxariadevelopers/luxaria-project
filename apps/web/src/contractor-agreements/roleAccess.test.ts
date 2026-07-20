import { describe, expect, it } from 'vitest';
import { resolveContractorAgreementCapabilities } from './roleAccess';

describe('resolveContractorAgreementCapabilities', () => {
  it('maps Nest contractor_agreement.* permissions', () => {
    const caps = resolveContractorAgreementCapabilities((code) =>
      [
        'contractor_agreement.view',
        'contractor_agreement.manage',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canManage).toBe(true);
    expect(caps.canApprove).toBe(false);
  });
});
