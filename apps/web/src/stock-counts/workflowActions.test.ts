import { describe, expect, it } from 'vitest';
import { resolveStockCountCapabilities } from './roleAccess';
import type { PublicStockCount } from './types';
import { StockCountStatus } from './types';
import { resolveStockCountRowActions } from './workflowActions';

function count(
  partial: Partial<PublicStockCount> & Pick<PublicStockCount, 'status'>,
): PublicStockCount {
  return {
    id: 'c1',
    countNumber: 'SC-2026-000001',
    projectId: '507f1f77bcf86cd799439011',
    countDate: '2026-07-17',
    countedBy: '507f1f77bcf86cd799439012',
    location: '',
    items: [],
    requiresDirectorApproval: false,
    notes: null,
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    approvedAt: null,
    postedBy: null,
    postedAt: null,
    journalEntryId: null,
    journalSkippedReason: null,
    ...partial,
  };
}

describe('resolveStockCountRowActions', () => {
  const full = resolveStockCountCapabilities(() => true);

  it('gates draft → submit → review → approve → post', () => {
    expect(resolveStockCountRowActions(count({ status: StockCountStatus.Draft }), full)).toEqual(
      expect.arrayContaining(['edit', 'submit', 'cancel']),
    );
    expect(
      resolveStockCountRowActions(
        count({ status: StockCountStatus.Submitted }),
        full,
      ),
    ).toEqual(expect.arrayContaining(['review', 'cancel']));
    expect(
      resolveStockCountRowActions(
        count({ status: StockCountStatus.Reviewed }),
        full,
      ),
    ).toEqual(expect.arrayContaining(['approve', 'cancel']));
    expect(
      resolveStockCountRowActions(
        count({ status: StockCountStatus.Approved }),
        full,
      ),
    ).toEqual(expect.arrayContaining(['post', 'cancel']));
    expect(
      resolveStockCountRowActions(
        count({ status: StockCountStatus.AdjustmentPosted }),
        full,
      ),
    ).toEqual([]);
  });

  it('hides approve for large variance without director permission', () => {
    const adjust = resolveStockCountCapabilities((code) =>
      ['stock.view', 'stock.adjust'].includes(code),
    );
    expect(
      resolveStockCountRowActions(
        count({
          status: StockCountStatus.Reviewed,
          requiresDirectorApproval: true,
        }),
        adjust,
      ),
    ).not.toContain('approve');
  });
});
