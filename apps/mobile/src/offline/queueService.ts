import { createIdempotencyKey, createOfflineId } from './ids';
import type { OfflineRepository } from './repository';
import {
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

export function computeNextRetryAt(
  attemptCount: number,
  now: Date = new Date(),
): string {
  const delay = Math.min(BASE_RETRY_MS * 2 ** Math.max(0, attemptCount - 1), MAX_RETRY_MS);
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
      endpoint: input.endpoint,
      method: input.method ?? 'POST',
      payloadJson: JSON.stringify(input.payload ?? {}),
      status: OfflineTxnStatus.Pending,
      attemptCount: 0,
      lastError: null,
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

  async listForUi(): Promise<
    Array<OfflineTransaction & { media: OfflineMedia[] }>
  > {
    const rows = await this.repo.listTransactions({ excludeSynced: true });
    const result = [];
    for (const txn of rows) {
      const media = await this.repo.getMediaForTransaction(txn.id);
      result.push({ ...txn, media });
    }
    return result;
  }

  async countActive(): Promise<number> {
    return this.repo.countActive();
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
      nextRetryAt: null,
      updatedAt: now,
    });
  }

  async markFailed(id: string, error: string) {
    const txn = await this.repo.getTransaction(id);
    if (!txn) return;
    const attemptCount = txn.attemptCount + 1;
    const now = this.clock.now();
    const exhausted = attemptCount >= MAX_SYNC_ATTEMPTS;
    await this.repo.updateTransaction(id, {
      status: OfflineTxnStatus.Failed,
      attemptCount,
      lastError: exhausted
        ? `${error} (max retries reached)`
        : error,
      nextRetryAt: exhausted ? null : computeNextRetryAt(attemptCount, now),
      updatedAt: now.toISOString(),
    });
  }

  async markConflict(id: string, error: string, serverTimestamp?: string | null) {
    const txn = await this.repo.getTransaction(id);
    if (!txn) return;
    await this.repo.updateTransaction(id, {
      status: OfflineTxnStatus.Conflict,
      lastError: error,
      serverTimestamp: serverTimestamp ?? null,
      nextRetryAt: null,
      attemptCount: txn.attemptCount + 1,
      updatedAt: this.clock.now().toISOString(),
    });
  }

  /** Manual retry — Failed or Conflict → Pending (safe due to idempotency key). */
  async manualRetry(id: string): Promise<OfflineTransaction | null> {
    const txn = await this.repo.getTransaction(id);
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

  async getMedia(transactionId: string) {
    return this.repo.getMediaForTransaction(transactionId);
  }

  async getTransaction(id: string) {
    return this.repo.getTransaction(id);
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
