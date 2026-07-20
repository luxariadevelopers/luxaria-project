import {
  OfflineFailureKind,
  OfflineTxnStatus,
  type OfflineTransaction,
} from '@/offline/types';

export const QueueFilter = {
  All: 'all',
  NeedsAttention: 'needs_attention',
  Failed: 'failed',
  Conflict: 'conflict',
  Pending: 'pending',
  Uploading: 'uploading',
  Permanent: 'permanent',
} as const;

export type QueueFilter = (typeof QueueFilter)[keyof typeof QueueFilter];

export const QUEUE_FILTER_OPTIONS: Array<{
  key: QueueFilter;
  label: string;
}> = [
  { key: QueueFilter.All, label: 'All' },
  { key: QueueFilter.NeedsAttention, label: 'Needs attention' },
  { key: QueueFilter.Failed, label: 'Failed' },
  { key: QueueFilter.Conflict, label: 'Conflict' },
  { key: QueueFilter.Permanent, label: 'Validation' },
  { key: QueueFilter.Pending, label: 'Pending' },
  { key: QueueFilter.Uploading, label: 'Uploading' },
];

export function matchesQueueFilter(
  txn: OfflineTransaction,
  filter: QueueFilter,
): boolean {
  switch (filter) {
    case QueueFilter.All:
      return true;
    case QueueFilter.NeedsAttention:
      return (
        txn.status === OfflineTxnStatus.Failed ||
        txn.status === OfflineTxnStatus.Conflict
      );
    case QueueFilter.Failed:
      return txn.status === OfflineTxnStatus.Failed;
    case QueueFilter.Conflict:
      return txn.status === OfflineTxnStatus.Conflict;
    case QueueFilter.Permanent:
      return txn.failureKind === OfflineFailureKind.Permanent;
    case QueueFilter.Pending:
      return txn.status === OfflineTxnStatus.Pending;
    case QueueFilter.Uploading:
      return txn.status === OfflineTxnStatus.Uploading;
    default:
      return true;
  }
}

export function filterQueueItems<T extends OfflineTransaction>(
  items: T[],
  filter: QueueFilter,
): T[] {
  return items.filter((item) => matchesQueueFilter(item, filter));
}

export function countNeedsAttention(items: OfflineTransaction[]): number {
  return items.filter((item) =>
    matchesQueueFilter(item, QueueFilter.NeedsAttention),
  ).length;
}
