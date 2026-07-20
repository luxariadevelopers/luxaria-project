import { describe, expect, it } from 'vitest';
import { resolveBankReconciliationCapabilities } from './roleAccess';

describe('resolveBankReconciliationCapabilities', () => {
  it('maps Nest permissions including finalise via manage', () => {
    const has = (code: string) =>
      [
        'bank_reconciliation.view',
        'bank_reconciliation.manage',
        'bank_reconciliation.import',
        'bank_reconciliation.match',
        'bank_reconciliation.post',
      ].includes(code);
    const caps = resolveBankReconciliationCapabilities(has);
    expect(caps.canView).toBe(true);
    expect(caps.canImport).toBe(true);
    expect(caps.canMatch).toBe(true);
    expect(caps.canPost).toBe(true);
    expect(caps.canFinalise).toBe(true);
  });

  it('denies finalise without manage', () => {
    const has = (code: string) => code === 'bank_reconciliation.view';
    const caps = resolveBankReconciliationCapabilities(has);
    expect(caps.canView).toBe(true);
    expect(caps.canFinalise).toBe(false);
    expect(caps.canImport).toBe(false);
  });
});
