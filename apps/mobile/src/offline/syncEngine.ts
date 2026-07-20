import { getErrorMessage } from '@/api/client';
import type { OfflineQueueService } from './queueService';
import type { OfflineSyncTransport } from './transport';
import {
  OfflineMediaStatus,
  isSyncConflictError,
  type OfflineMedia,
} from './types';

export type SyncEngineOptions = {
  queue: OfflineQueueService;
  transport: OfflineSyncTransport;
  isOnline: () => boolean;
  onChange?: () => void;
};

/**
 * Offline-first sync engine:
 * 1) claim transaction
 * 2) upload media that is not yet uploaded
 * 3) sync payload with stable Idempotency-Key
 * 4) mark synced / failed / conflict
 */
export class OfflineSyncEngine {
  private running = false;

  constructor(private readonly options: SyncEngineOptions) {}

  async processQueue(): Promise<{ processed: number; errors: number }> {
    if (this.running) {
      return { processed: 0, errors: 0 };
    }
    if (!this.options.isOnline()) {
      return { processed: 0, errors: 0 };
    }

    this.running = true;
    let processed = 0;
    let errors = 0;

    try {
      const ids = await this.options.queue.getProcessableIds();
      for (const id of ids) {
        if (!this.options.isOnline()) break;
        const ok = await this.processOne(id);
        processed += 1;
        if (!ok) errors += 1;
      }
    } finally {
      this.running = false;
      this.options.onChange?.();
    }

    return { processed, errors };
  }

  async processOne(transactionId: string): Promise<boolean> {
    const claimed = await this.options.queue.claimForSync(transactionId);
    if (!claimed) {
      return true;
    }

    try {
      const media = await this.options.queue.getMedia(claimed.id);
      await this.uploadPendingMedia(claimed.projectId, media);

      const freshMedia = await this.options.queue.getMedia(claimed.id);
      const pending = freshMedia.filter(
        (m) => m.uploadStatus !== OfflineMediaStatus.Uploaded,
      );
      if (pending.length > 0) {
        throw new Error(
          `Media not ready: ${pending.map((m) => m.fileName).join(', ')}`,
        );
      }

      const payload = this.options.queue.buildSyncPayload(claimed, freshMedia);
      const result = await this.options.transport.syncTransaction(
        claimed,
        payload,
      );

      await this.options.queue.markSynced(claimed.id, {
        serverRecordId: result.serverRecordId,
        serverTimestamp: result.serverTimestamp,
      });
      this.options.onChange?.();
      return true;
    } catch (error) {
      if (isSyncConflictError(error)) {
        await this.options.queue.markConflict(
          claimed.id,
          error.message,
          error.serverTimestamp,
        );
      } else {
        await this.options.queue.markFailed(
          claimed.id,
          getErrorMessage(error, 'Sync failed'),
        );
      }
      this.options.onChange?.();
      return false;
    }
  }

  private async uploadPendingMedia(
    projectId: string | null,
    media: OfflineMedia[],
  ) {
    for (const row of media) {
      if (row.uploadStatus === OfflineMediaStatus.Uploaded && row.serverDocumentId) {
        continue;
      }

      await this.options.queue.markMediaUploading(row.id);
      try {
        const serverDocumentId = await this.options.transport.uploadMedia(
          row,
          projectId,
        );
        await this.options.queue.markMediaUploaded(row.id, serverDocumentId);
      } catch (error) {
        const message = getErrorMessage(error, 'Media upload failed');
        await this.options.queue.markMediaFailed(row.id, message);
        throw new Error(`Media upload failed for ${row.fileName}: ${message}`);
      }
    }
  }
}
