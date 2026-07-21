import {
  OfflineFailureKind,
  OfflineTxnStatus,
  type OfflineTransaction,
} from '@/offline/types';
import {
  QueueFilter,
  filterQueueItems,
  matchesQueueFilter,
} from '../queueFilters';
import { resolveOpenRecord } from '../openRecord';

function baseTxn(
  patch: Partial<OfflineTransaction>,
): OfflineTransaction {
  return {
    id: '1',
    idempotencyKey: 'k',
    type: 'demo',
    label: 'L',
    projectId: 'p1',
    siteId: null,
    companyId: null,
    createdByUserId: 'u1',
    action: null,
    endpoint: '/x',
    method: 'POST',
    payloadJson: '{}',
    status: OfflineTxnStatus.Pending,
    attemptCount: 0,
    lastError: null,
    lastErrorCode: null,
    failureKind: null,
    deviceTimestamp: '2026-07-20T00:00:00.000Z',
    serverTimestamp: null,
    serverRecordId: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    nextRetryAt: null,
    ...patch,
  };
}

describe('queueFilters', () => {
  it('filters needs attention, conflict, and permanent validation', () => {
    const items = [
      baseTxn({ id: 'a', status: OfflineTxnStatus.Pending }),
      baseTxn({ id: 'b', status: OfflineTxnStatus.Failed }),
      baseTxn({ id: 'c', status: OfflineTxnStatus.Conflict }),
      baseTxn({
        id: 'd',
        status: OfflineTxnStatus.Failed,
        failureKind: OfflineFailureKind.Permanent,
      }),
    ];

    expect(filterQueueItems(items, QueueFilter.NeedsAttention).map((i) => i.id)).toEqual([
      'b',
      'c',
      'd',
    ]);
    expect(
      items.filter((i) => matchesQueueFilter(i, QueueFilter.Conflict)).map((i) => i.id),
    ).toEqual(['c']);
    expect(
      filterQueueItems(items, QueueFilter.Permanent).map((i) => i.id),
    ).toEqual(['d']);
  });
});

describe('resolveOpenRecord', () => {
  it('maps known offline types to existing screens only', () => {
    expect(resolveOpenRecord(baseTxn({ type: 'grn.create' }))).toEqual({
      screen: 'GoodsReceipt',
      label: 'Open goods receipt form',
    });
    expect(resolveOpenRecord(baseTxn({ type: 'dpr.create' }))).toEqual({
      screen: 'DailyProgressReport',
      label: 'Open daily progress form',
    });
    expect(resolveOpenRecord(baseTxn({ type: 'demo.offline' }))).toBeNull();
  });
});
