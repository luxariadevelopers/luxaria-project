import { describe, expect, it } from 'vitest';
import { resolveMaterialIssueCapabilities } from './roleAccess';

describe('resolveMaterialIssueCapabilities', () => {
  it('maps Nest stock.* codes (not material_issue.* aliases)', () => {
    const caps = resolveMaterialIssueCapabilities((code) =>
      ['stock.view', 'stock.issue', 'stock.adjust', 'boq.view'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canConfirm).toBe(true);
    expect(caps.canViewBoq).toBe(true);
    expect(caps.canViewMaterials).toBe(false);
  });

  it('viewer without stock.issue cannot create or confirm', () => {
    const caps = resolveMaterialIssueCapabilities(
      (code) => code === 'stock.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(false);
    expect(caps.canConfirm).toBe(false);
    expect(caps.canReturn).toBe(false);
  });

  it('stock.adjust alone can confirm but not create', () => {
    const caps = resolveMaterialIssueCapabilities((code) =>
      ['stock.view', 'stock.adjust'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(false);
    expect(caps.canConfirm).toBe(true);
  });
});
