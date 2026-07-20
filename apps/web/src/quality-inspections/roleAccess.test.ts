import { describe, expect, it } from 'vitest';
import { resolveQualityInspectionCapabilities } from './roleAccess';

describe('resolveQualityInspectionCapabilities', () => {
  it('maps Nest quality.view / quality.inspect codes', () => {
    const caps = resolveQualityInspectionCapabilities((code) =>
      ['quality.view', 'quality.inspect'].includes(code),
    );
    expect(caps).toEqual({ canView: true, canInspect: true });
  });

  it('does not accept quality_inspection.* aliases', () => {
    const caps = resolveQualityInspectionCapabilities((code) =>
      [
        'quality_inspection.view',
        'quality_inspection.create',
        'quality_inspection.approve',
      ].includes(code),
    );
    expect(caps).toEqual({ canView: false, canInspect: false });
  });
});
