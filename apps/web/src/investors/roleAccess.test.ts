import { describe, expect, it } from 'vitest';
import { resolveInvestorCapabilities } from './roleAccess';

describe('resolveInvestorCapabilities', () => {
  it('maps verify to investor.verify_kyc (not investor.verify)', () => {
    const caps = resolveInvestorCapabilities(
      (code) => code === 'investor.view' || code === 'investor.verify_kyc',
    );
    expect(caps.canVerifyKyc).toBe(true);
    expect(
      resolveInvestorCapabilities((code) => code === 'investor.verify')
        .canVerifyKyc,
    ).toBe(false);
  });

  it('separates create / update / activate', () => {
    const caps = resolveInvestorCapabilities((code) =>
      [
        'investor.view',
        'investor.create',
        'investor.update',
        'investor.activate',
      ].includes(code),
    );
    expect(caps.canCreate).toBe(true);
    expect(caps.canUpdate).toBe(true);
    expect(caps.canActivate).toBe(true);
    expect(caps.canVerifyKyc).toBe(false);
    expect(caps.canUploadDocument).toBe(false);
  });

  it('denies verify_kyc and upload without those permissions', () => {
    const caps = resolveInvestorCapabilities(
      (code) => code === 'investor.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canVerifyKyc).toBe(false);
    expect(caps.canUploadDocument).toBe(false);
    expect(caps.canViewAll).toBe(false);
  });

  it('maps upload_document and view_all separately', () => {
    const caps = resolveInvestorCapabilities((code) =>
      [
        'investor.view',
        'investor.view_all',
        'investor.upload_document',
      ].includes(code),
    );
    expect(caps.canUploadDocument).toBe(true);
    expect(caps.canViewAll).toBe(true);
    expect(caps.canVerifyKyc).toBe(false);
  });
});
