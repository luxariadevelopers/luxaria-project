import { describe, expect, it } from 'vitest';
import {
  canApproveStockCount,
  resolveStockCountCapabilities,
} from './roleAccess';

describe('resolveStockCountCapabilities', () => {
  it('maps Nest stock.* codes (not stock_count.* aliases)', () => {
    const caps = resolveStockCountCapabilities((code) =>
      ['stock.view', 'stock.adjust', 'stock.count.director_approve'].includes(
        code,
      ),
    );
    expect(caps).toEqual({
      canView: true,
      canAdjust: true,
      canDirectorApprove: true,
    });
  });
});

describe('canApproveStockCount', () => {
  it('requires director permission for large variances', () => {
    const adjustOnly = resolveStockCountCapabilities((code) =>
      ['stock.view', 'stock.adjust'].includes(code),
    );
    expect(canApproveStockCount(adjustOnly, true)).toBe(false);
    expect(canApproveStockCount(adjustOnly, false)).toBe(true);

    const director = resolveStockCountCapabilities((code) =>
      ['stock.view', 'stock.count.director_approve'].includes(code),
    );
    expect(canApproveStockCount(director, true)).toBe(true);
  });
});
