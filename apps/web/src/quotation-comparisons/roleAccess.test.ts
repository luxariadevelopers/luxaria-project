import { describe, expect, it } from 'vitest';
import { resolveQuotationComparisonCapabilities } from './roleAccess';

describe('resolveQuotationComparisonCapabilities', () => {
  it('maps Nest quotation.compare / quotation.recommend', () => {
    const caps = resolveQuotationComparisonCapabilities((code) =>
      ['quotation.compare', 'quotation.recommend', 'approval.act'].includes(
        code,
      ),
    );
    expect(caps.canCompare).toBe(true);
    expect(caps.canView).toBe(true);
    expect(caps.canGenerate).toBe(true);
    expect(caps.canExportPdf).toBe(true);
    expect(caps.canCancel).toBe(true);
    expect(caps.canRecommend).toBe(true);
    expect(caps.canSubmitApproval).toBe(true);
    expect(caps.canActOnApproval).toBe(true);
  });

  it('does not invent quotation.approve', () => {
    const caps = resolveQuotationComparisonCapabilities(
      (code) => code === 'quotation.approve',
    );
    expect(caps.canCompare).toBe(false);
    expect(caps.canRecommend).toBe(false);
    expect(caps.canSubmitApproval).toBe(false);
    expect(caps.canActOnApproval).toBe(false);
  });

  it('compare-only cannot recommend or submit', () => {
    const caps = resolveQuotationComparisonCapabilities(
      (code) => code === 'quotation.compare',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canRecommend).toBe(false);
    expect(caps.canSubmitApproval).toBe(false);
  });
});
