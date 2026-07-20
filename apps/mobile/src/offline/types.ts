export const OfflineTxnStatus = {
  Pending: 'pending',
  Uploading: 'uploading',
  Synced: 'synced',
  Failed: 'failed',
  Conflict: 'conflict',
} as const;

export type OfflineTxnStatus =
  (typeof OfflineTxnStatus)[keyof typeof OfflineTxnStatus];

export const OfflineMediaStatus = {
  Pending: 'pending',
  Uploading: 'uploading',
  Uploaded: 'uploaded',
  Failed: 'failed',
} as const;

export type OfflineMediaStatus =
  (typeof OfflineMediaStatus)[keyof typeof OfflineMediaStatus];

/** Classifies failed syncs for UI resolution (conflict uses status=conflict). */
export const OfflineFailureKind = {
  Transient: 'transient',
  Permanent: 'permanent',
  Forbidden: 'forbidden',
} as const;

export type OfflineFailureKind =
  (typeof OfflineFailureKind)[keyof typeof OfflineFailureKind];

export type OfflineTransaction = {
  id: string;
  idempotencyKey: string;
  type: string;
  label: string;
  projectId: string | null;
  /** Owner of the queued row; actions restricted to this user. */
  createdByUserId: string | null;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payloadJson: string;
  status: OfflineTxnStatus;
  attemptCount: number;
  lastError: string | null;
  lastErrorCode: string | null;
  failureKind: OfflineFailureKind | null;
  deviceTimestamp: string;
  serverTimestamp: string | null;
  serverRecordId: string | null;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: string | null;
};

export type OfflineMedia = {
  id: string;
  transactionId: string;
  localPath: string;
  mimeType: string;
  fileName: string;
  fieldKey: string;
  uploadStatus: OfflineMediaStatus;
  serverDocumentId: string | null;
  lastError: string | null;
  /** Optional JSON for documents/presign fields (module, entityType, …). */
  uploadMetaJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnqueueMediaInput = {
  localPath: string;
  mimeType: string;
  fileName: string;
  fieldKey: string;
  uploadMeta?: Record<string, unknown>;
};

export type EnqueueTransactionInput = {
  type: string;
  label: string;
  projectId?: string | null;
  createdByUserId?: string | null;
  endpoint: string;
  method?: 'POST' | 'PATCH' | 'PUT';
  payload: Record<string, unknown>;
  media?: EnqueueMediaInput[];
  /** Defaults to the transaction UUID. */
  idempotencyKey?: string;
  deviceTimestamp?: string;
};

export type SyncTransactionResult = {
  serverRecordId: string;
  serverTimestamp: string;
  /** Full response body for debugging / replay. */
  response?: unknown;
};

export type SyncConflictError = Error & {
  code: 'conflict';
  serverTimestamp?: string | null;
};

export type SyncPermanentError = Error & {
  code: 'permanent';
  errorCode?: string | null;
};

export type SyncForbiddenError = Error & {
  code: 'forbidden';
  errorCode?: string | null;
};

export function isSyncConflictError(error: unknown): error is SyncConflictError {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as SyncConflictError).code === 'conflict'
  );
}

export function isSyncPermanentError(
  error: unknown,
): error is SyncPermanentError {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as SyncPermanentError).code === 'permanent'
  );
}

export function isSyncForbiddenError(
  error: unknown,
): error is SyncForbiddenError {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as SyncForbiddenError).code === 'forbidden'
  );
}

export function createSyncConflictError(
  message: string,
  serverTimestamp?: string | null,
): SyncConflictError {
  const err = new Error(message) as SyncConflictError;
  err.code = 'conflict';
  err.serverTimestamp = serverTimestamp ?? null;
  return err;
}

export function createSyncPermanentError(
  message: string,
  errorCode?: string | null,
): SyncPermanentError {
  const err = new Error(message) as SyncPermanentError;
  err.code = 'permanent';
  err.errorCode = errorCode ?? null;
  return err;
}

export function createSyncForbiddenError(
  message: string,
  errorCode?: string | null,
): SyncForbiddenError {
  const err = new Error(message) as SyncForbiddenError;
  err.code = 'forbidden';
  err.errorCode = errorCode ?? null;
  return err;
}
