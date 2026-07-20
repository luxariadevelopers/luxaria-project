import { describe, expect, it } from 'vitest';
import {
  filterPermittedSources,
  groupQuickSearchResults,
  QUICK_SEARCH_SOURCES,
} from './searchSources';
import type { QuickSearchSourceResult } from './types';

describe('filterPermittedSources', () => {
  it('returns only sources the user may view', () => {
    const permitted = filterPermittedSources({
      hasPermission: (p) => p === 'project.view' || p === 'vendor.view',
    });
    expect(permitted.map((s) => s.id)).toEqual(['projects', 'vendors']);
  });

  it('returns all sources when bypassPermissions is set', () => {
    const permitted = filterPermittedSources({
      hasPermission: () => false,
      bypassPermissions: true,
    });
    expect(permitted).toHaveLength(QUICK_SEARCH_SOURCES.length);
  });

  it('returns empty when the user has no searchable permissions', () => {
    expect(
      filterPermittedSources({ hasPermission: () => false }),
    ).toEqual([]);
  });
});

describe('groupQuickSearchResults', () => {
  it('merges transaction sources into one group', () => {
    const results: QuickSearchSourceResult[] = [
      {
        sourceId: 'purchase-orders',
        groupId: 'transactions',
        hits: [
          {
            id: 'po1',
            sourceId: 'purchase-orders',
            groupId: 'transactions',
            title: 'PO-2026-000001',
            subtitle: 'Purchase order',
            status: 'draft',
            path: '/procurement/purchase-orders/po1',
            projectId: 'p1',
          },
        ],
        error: null,
      },
      {
        sourceId: 'bookings',
        groupId: 'transactions',
        hits: [
          {
            id: 'b1',
            sourceId: 'bookings',
            groupId: 'transactions',
            title: 'BK-2026-000001',
            subtitle: 'Booking',
            status: 'hold',
            path: '/sales/bookings?id=b1',
            projectId: 'p1',
          },
        ],
        error: null,
      },
    ];

    const groups = groupQuickSearchResults(results, QUICK_SEARCH_SOURCES);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.groupId).toBe('transactions');
    expect(groups[0]?.hits).toHaveLength(2);
  });
});
