import { createIdempotencyKey, createOfflineId } from './ids';
import type { OfflineRepository } from './repository';
import {
  OfflineFailureKind,
  OfflineMediaStatus,
  OfflineTxnStatus,
  type EnqueueTransactionInput,
  type OfflineMedia,
  type OfflineTransaction,
} from './types';

export const MAX_SYNC_ATTEMPTS = 8;
export const UPLOADING_STUCK_MS = 10 * 60 * 1000;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 15 * 60 * 1000;

export type QueueClock = {
  now(): Date;
};

const defaultClock: QueueClock = {
  now: () => new Date(),
};

export type QueueActorContext = {
  userId: string;
  /** Project IDs the actor may access. Empty + bypass=false blocks project-scoped rows. */
  accessibleProjectIds: ReadonlySet<string> | readonly string[];
  bypassProjectAccess?: boolean;
};

export class QueueAccessError extends Error {
  readonly code: 'forbidden' | 'not_found' | 'invalid_state';

  constructor(code: QueueAccessError['code'], message: string) {
    super(message);
    this.name = 'QueueAccessError';
    this.code = code;
  }
}

export function computeNextRetryAt(
  attemptCount: number,
  now: Date = new Date(),
): string {
  const delay = Math.min(
    BASE_RETRY_MS * 2 ** Math.max(0, attemptCount - 1),
    MAX_RETRY_MS,
  );
  return new Date(now.getTime() + delay).toISOString();
}

export function isRetryDue(
  txn: OfflineTransaction,
  now: Date = new Date(),
): boolean {
  if (!txn.nextRetryAt) return true;
  return new Date(txn.nextRetryAt).getTime() <= now.getTime();
}

export function isUploadingStuck(
  txn: OfflineTransaction,
  now: Date = new Date(),
  stuckMs = UPLOADING_STUCK_MS,
): boolean {
  if (txn.status !== OfflineTxnStatus.Uploading) return false;
  return now.getTime() - new Date(txn.updatedAt).getTime() >= stuckMs;
}

export function canAutoProcess(
  txn: OfflineTransaction,
  now: Date = new Date(),
): boolean {
  if (txn.failureKind === OfflineFailureKind.Permanent) return false;
  if (txn.failureKind === OfflineFailureKind.Forbidden) return false;
  if (txn.status === OfflineTxnStatus.Pending) {
    // Fresh enqueue or manual retry (nextRetryAt cleared) always eligible.
    if (!txn.nextRetryAt) return true;
    return isRetryDue(txn, now) && txn.attemptCount < MAX_SYNC_ATTEMPTS;
  }
  if (txn.status === OfflineTxnStatus.Failed) {
    if (txn.attemptCount >= MAX_SYNC_ATTEMPTS) return false;
    return isRetryDue(txn, now);
  }
  if (isUploadingStuck(txn, now)) {
    return true;
  }
  return false;
}

export function isQueueOwner(
  txn: OfflineTransaction,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  // Legacy rows without owner remain actionable on the device that holds them.
  if (!txn.createdByUserId) return true;
  return txn.createdByUserId === userId;
}

export function hasQueueProjectAccess(
  txn: OfflineTransaction,
  actor: Pick<QueueActorContext, 'accessibleProjectIds' | 'bypassProjectAccess'>,
): boolean {
  if (!txn.projectId) return true;
  if (actor.bypassProjectAccess) return true;
  const ids = actor.accessibleProjectIds;
  if (ids instanceof Set) {
    return ids.has(txn.projectId);
  }
  return (ids as readonly string[]).includes(txn.projectId);
}

export function assertCanActOnQueueItem(
  txn: OfflineTransaction | null,
  actor: QueueActorContext,
): OfflineTransaction {
  if (!txn) {
    throw new QueueAccessError('not_found', 'Queued record not found');
  }
  if (!isQueueOwner(txn, actor.userId)) {
    throw new QueueAccessError(
      'forbidden',
      'You can only resolve your own queued records',
    );
  }
  if (!hasQueueProjectAccess(txn, actor)) {
    throw new QueueAccessError(
      'forbidden',
      'You do not have access to this project queue item',
    );
  }
  return txn;
}

export function canDiscardQueueItem(txn: OfflineTransaction): boolean {
  return (
    txn.status === OfflineTxnStatus.Pending ||
    txn.status === OfflineTxnStatus.Failed ||
    txn.status === OfflineTxnStatus.Conflict
  );
}

export class OfflineQueueService {
  constructor(
    private readonly repo: OfflineRepository,
    private readonly clock: QueueClock = defaultClock,
    private readonly idFactory: () => string = createOfflineId,
  ) {}

  async init() {
    await this.repo.init();
  }

  async enqueue(input: EnqueueTransactionInput): Promise<OfflineTransaction> {
    const now = this.clock.now().toISOString();
    const id = this.idFactory();
    const idempotencyKey =
      input.idempotencyKey?.trim() || createIdempotencyKey(id);

    const existing = await this.repo.listTransactions();
    const duplicate = existing.find((t) => t.idempotencyKey === idempotencyKey);
    if (duplicate) {
      throw new Error(
        `Duplicate idempotency key ${idempotencyKey}; transaction already queued as ${duplicate.id}`,
      );
    }

    const txn: OfflineTransaction = {
      id,
      idempotencyKey,
      type: input.type,
      label: input.label,
      projectId: input.projectId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      endpoint: input.endpoint,
      method: input.method ?? 'POST',
      payloadJson: JSON.stringify(input.payload ?? {}),
      status: OfflineTxnStatus.Pending,
      attemptCount: 0,
      lastError: null,
      lastErrorCode: null,
      failureKind: null,
      deviceTimestamp: input.deviceTimestamp ?? now,
      serverTimestamp: null,
      serverRecordId: null,
      createdAt: now,
      updatedAt: now,
      nextRetryAt: null,
    };

    await this.repo.insertTransaction(txn);

    for (const mediaInput of input.media ?? []) {
      const media: OfflineMedia = {
        id: this.idFactory(),
        transactionId: id,
        localPath: mediaInput.localPath,
        mimeType: mediaInput.mimeType,
        fileName: mediaInput.fileName,
        fieldKey: mediaInput.fieldKey,
        uploadStatus: OfflineMediaStatus.Pending,
        serverDocumentId: null,
        lastError: null,
        uploadMetaJson: mediaInput.uploadMeta
          ? JSON.stringify(mediaInput.uploadMeta)
          : null,
        createdAt: now,
        updatedAt: now,
      };
      await this.repo.insertMedia(media);
    }

    return txn;
  }

  async listForUi(userId?: string | null): Promise<
    Array<OfflineTransaction & { media: OfflineMedia[] }>
  > {
    const rows = await this.repo.listTransactions({
      excludeSynced: true,
      createdByUserId: userId ?? undefined,
    });
    const result = [];
    for (const txn of rows) {
      const media = await this.repo.getMediaForTransaction(txn.id);
      result.push({ ...txn, media });
    }
    return result;
  }

  async countActive(userId?: string | null): Promise<number> {
    return this.repo.countActive({
      createdByUserId: userId ?? undefined,
    });
  }

  async getProcessableIds(): Promise<string[]> {
    const now = this.clock.now();
    // Recover stuck uploads first
    const uploading = await this.repo.listTransactions({
      statuses: [OfflineTxnStatus.Uploading],
    });
    for (const txn of uploading) {
      if (isUploadingStuck(txn, now)) {
        await this.repo.updateTransaction(txn.id, {
          status: OfflineTxnStatus.Pending,
          updatedAt: now.toISOString(),
          lastError: 'Recovered stuck upload; will retry safely',
          failureKind: OfflineFailureKind.Transient,
        });
      }
    }

    const candidates = await this.repo.listTransactions({
      statuses: [OfflineTxnStatus.Pending, OfflineTxnStatus.Failed],
    });

    return candidates
      .filter((txn) => canAutoProcess(txn, now))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((txn) => txn.id);
  }

  async claimForSync(id: string): Promise<OfflineTransaction | null> {
    const now = this.clock.now().toISOString();
    return this.repo.claimTransaction(
      id,
      [OfflineTxnStatus.Pending, OfflineTxnStatus.Failed],
      OfflineTxnStatus.Uploading,
      now,
    );
  }

  async markMediaUploading(mediaId: string) {
    await this.repo.updateMedia(mediaId, {
      uploadStatus: OfflineMediaStatus.Uploading,
      updatedAt: this.clock.now().toISOString(),
      lastError: null,
    });
  }

  async markMediaUploaded(mediaId: string, serverDocumentId: string) {
    await this.repo.updateMedia(mediaId, {
      uploadStatus: OfflineMediaStatus.Uploaded,
      serverDocumentId,
      updatedAt: this.clock.now().toISOString(),
      lastError: null,
    });
  }

  async markMediaFailed(mediaId: string, error: string) {
    await this.repo.updateMedia(mediaId, {
      uploadStatus: OfflineMediaStatus.Failed,
      lastError: error,
      updatedAt: this.clock.now().toISOString(),
    });
  }

  async markSynced(
    id: string,
    input: { serverRecordId: string; serverTimestamp: string },
  ) {
    const now = this.clock.now().toISOString();
    await this.repo.updateTransaction(id, {
      status: OfflineTxnStatus.Synced,
      serverRecordId: input.serverRecordId,
      serverTimestamp: input.serverTimestamp,
      lastError: null,
      lastErrorCode: null,
      failureKind: null,
      nextRetryAt: null,
      updatedAt: now,
    });
  }

  async markFailed(
    id: string,
    error: string,
    options?: {
      permanent?: boolean;
      forbidden?: boolean;
      errorCode?: string | null;
    },
  ) {
    const txn = await this.repo.getTransaction(id);
    if (!txn) return;
    const attemptCount = txn.attemptCount + 1;
    const now = this.clock.now();
    const permanent = Boolean(options?.permanent);
    const forbidden = Boolean(options?.forbidden);
    const exhausted = attemptCount >= MAX_SYNC_ATTEMPTS;
    const failureKind = forbidden
      ? OfflineFailureKind.Forbidden
      : permanent
        ? OfflineFailureKind.Permanent
        : OfflineFailureKind.Transient;
    const stopAuto = permanent || forbidden || exhausted;

    await this.repo.updateTransaction(id, {
      status: OfflineTxnStatus.Failed,
      attemptCount,
      lastError: exhausted && !permanent && !forbidden
        ? `${error} (max retries reached)`
        : error,
      lastErrorCode: options?.errorCode ?? null,
      failureKind,
      nextRetryAt: stopAuto ? null : computeNextRetryAt(attemptCount, now),
      updatedAt: now.toISOString(),
    });
  }

  async markConflict(id: string, error: string, serverTimestamp?: string | null) {
    const txn = await this.repo.getTransaction(id);
    if (!txn) return;
    await this.repo.updateTransaction(id, {
      status: OfflineTxnStatus.Conflict,
      lastError: error,
      lastErrorCode: 'CONFLICT',
      failureKind: null,
      serverTimestamp: serverTimestamp ?? null,
      nextRetryAt: null,
      attemptCount: txn.attemptCount + 1,
      updatedAt: this.clock.now().toISOString(),
    });
  }

  /** Manual retry — Failed or Conflict → Pending (safe due to idempotency key). */
  async manualRetry(
    id: string,
    actor?: QueueActorContext,
  ): Promise<OfflineTransaction | null> {
    const txn = await this.repo.getTransaction(id);
    if (actor) {
      assertCanActOnQueueItem(txn, actor);
    }
    if (!txn) return null;
    if (
      txn.status !== OfflineTxnStatus.Failed &&
      txn.status !== OfflineTxnStatus.Conflict
    ) {
      return txn;
    }
    const now = this.clock.now().toISOString();
    await this.repo.updateTransaction(id, {
      status: OfflineTxnStatus.Pending,
      lastError: null,
      lastErrorCode: null,
      failureKind: null,
      nextRetryAt: null,
      updatedAt: now,
    });

    const media = await this.repo.getMediaForTransaction(id);
    for (const row of media) {
      if (row.uploadStatus === OfflineMediaStatus.Failed) {
        await this.repo.updateMedia(row.id, {
          uploadStatus: OfflineMediaStatus.Pending,
          lastError: null,
          updatedAt: now,
        });
      }
    }

    return this.repo.getTransaction(id);
  }

  /**
   * Explicit discard only. Never called automatically — UI must confirm.
   * Blocks synced / uploading rows so submitted work is not silently dropped.
   */
  async discardDraft(
    id: string,
    actor: QueueActorContext,
    options?: { confirmed?: boolean },
  ): Promise<void> {
    if (!options?.confirmed) {
      throw new QueueAccessError(
        'invalid_state',
        'Discard requires explicit confirmation',
      );
    }
    const txn = assertCanActOnQueueItem(
      await this.repo.getTransaction(id),
      actor,
    );
    if (!canDiscardQueueItem(txn)) {
      throw new QueueAccessError(
        'invalid_state',
        `Cannot discard a ${txn.status} queue item`,
      );
    }
    await this.repo.deleteTransaction(id);
  }

  async getMedia(transactionId: string) {
    return this.repo.getMediaForTransaction(transactionId);
  }

  async getTransaction(id: string) {
    return this.repo.getTransaction(id);
  }

  async getForActor(
    id: string,
    actor: QueueActorContext,
  ): Promise<(OfflineTransaction & { media: OfflineMedia[] }) | null> {
    const txn = await this.repo.getTransaction(id);
    if (!txn) return null;
    assertCanActOnQueueItem(txn, actor);
    const media = await this.repo.getMediaForTransaction(id);
    return { ...txn, media };
  }

  /**
   * Merge uploaded document IDs into the payload under `attachments`
   * and per-field keys without mutating already-synced identity fields.
   */
  buildSyncPayload(
    txn: OfflineTransaction,
    media: OfflineMedia[],
  ): Record<string, unknown> {
    const payload = JSON.parse(txn.payloadJson) as Record<string, unknown>;
    const attachments: Record<string, string> = {};
    for (const row of media) {
      if (row.serverDocumentId) {
        attachments[row.fieldKey] = row.serverDocumentId;
        payload[row.fieldKey] = row.serverDocumentId;
      }
    }
    return {
      ...payload,
      attachments,
      clientTransactionId: txn.id,
      idempotencyKey: txn.idempotencyKey,
      deviceTimestamp: txn.deviceTimestamp,
    };
  }
}
