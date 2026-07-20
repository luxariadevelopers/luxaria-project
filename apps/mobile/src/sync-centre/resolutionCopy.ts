import {
  OfflineFailureKind,
  OfflineTxnStatus,
  type OfflineTransaction,
} from '@/offline/types';

export function statusLabel(status: OfflineTxnStatus | string): string {
  switch (status) {
    case OfflineTxnStatus.Pending:
      return 'Pending';
    case OfflineTxnStatus.Uploading:
      return 'Uploading';
    case OfflineTxnStatus.Synced:
      return 'Synced';
    case OfflineTxnStatus.Failed:
      return 'Failed';
    case OfflineTxnStatus.Conflict:
      return 'Conflict';
    default:
      return String(status);
  }
}

export function failureHeadline(txn: OfflineTransaction): string {
  if (txn.status === OfflineTxnStatus.Conflict) {
    return 'Server conflict';
  }
  if (txn.failureKind === OfflineFailureKind.Permanent) {
    return 'Validation rejected';
  }
  if (txn.failureKind === OfflineFailureKind.Forbidden) {
    return 'Permission denied';
  }
  if (txn.status === OfflineTxnStatus.Failed) {
    return 'Sync failed';
  }
  return statusLabel(txn.status);
}

export function failureGuidance(txn: OfflineTransaction): string {
  if (txn.status === OfflineTxnStatus.Conflict) {
    return 'The server already has a conflicting version. Review the timestamps, open the related form if needed, then retry (idempotent) or discard this draft after confirming.';
  }
  if (txn.failureKind === OfflineFailureKind.Permanent) {
    return 'The server permanently rejected this payload. Fix the source data and capture again, or discard this draft after confirming. Auto-retry is disabled.';
  }
  if (txn.failureKind === OfflineFailureKind.Forbidden) {
    return 'You are not allowed to sync this record for the project. Switch project or ask an admin — retry will only succeed after access is restored.';
  }
  if (txn.status === OfflineTxnStatus.Failed) {
    return 'A temporary error stopped sync. Retry when online; the same Idempotency-Key prevents duplicates.';
  }
  return 'This item is waiting to sync.';
}

export function canRetryQueueItem(txn: OfflineTransaction): boolean {
  return (
    txn.status === OfflineTxnStatus.Failed ||
    txn.status === OfflineTxnStatus.Conflict
  );
}
