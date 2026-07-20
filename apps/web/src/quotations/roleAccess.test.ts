import { describe, expect, it } from 'vitest';
import { resolveQuotationCapabilities } from './roleAccess';

describe('resolveQuotationCapabilities', () => {
  it('maps Nest quotation.view / manage / finalize (not create/revise aliases)', () => {
    const caps = resolveQuotationCapabilities((code) =>
      ['quotation.view', 'quotation.manage', 'quotation.finalize'].includes(
        code,
      ),
    );
    expect(caps).toEqual({
      canView: true,
      canManage: true,
      canFinalize: true,
    });
  });

  it('denies when only prompt-alias codes are present', () => {
    const caps = resolveQuotationCapabilities((code) =>
      ['quotation.create', 'quotation.revise'].includes(code),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canManage).toBe(false);
    expect(caps.canFinalize).toBe(false);
  });
});
