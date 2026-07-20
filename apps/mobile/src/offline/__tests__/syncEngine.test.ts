import { OfflineQueueService } from '../queueService';
import { createMemoryOfflineRepository } from '../repository';
import { OfflineSyncEngine } from '../syncEngine';
import type { OfflineSyncTransport } from '../transport';
import {
  OfflineFailureKind,
  OfflineTxnStatus,
  createSyncConflictError,
  createSyncPermanentError,
  type OfflineMedia,
  type OfflineTransaction,
} from '../types';

describe('OfflineSyncEngine', () => {
  let queue: OfflineQueueService;
  let uploaded: string[];
  let syncedKeys: string[];
  let transport: OfflineSyncTransport;
  let online: boolean;

  beforeEach(async () => {
    let n = 0;
    queue = new OfflineQueueService(
      createMemoryOfflineRepository(),
      { now: () => new Date('2026-07-17T06:00:00.000Z') },
      () => `id-${++n}`,
    );
    await queue.init();
    uploaded = [];
    syncedKeys = [];
    online = true;

    transport = {
      async uploadMedia(media: OfflineMedia) {
        uploaded.push(media.localPath);
        return `doc-${media.id}`;
      },
      async syncTransaction(
        txn: OfflineTransaction,
        payload: Record<string, unknown>,
      ) {
        syncedKeys.push(txn.idempotencyKey);
        return {
          serverRecordId: `srv-${txn.id}`,
          serverTimestamp: '2026-07-17T09:00:00.000Z',
          response: payload,
        };
      },
    };
  });

  it('uploads media before final transaction sync and uses idempotency key', async () => {
    const txn = await queue.enqueue({
      type: 'site_expense.voucher',
      label: 'Steel',
      endpoint: '/site-expense-vouchers',
      payload: { amount: 100 },
      media: [
        {
          localPath: 'file:///a.jpg',
          mimeType: 'image/jpeg',
          fileName: 'a.jpg',
          fieldKey: 'photo',
        },
        {
          localPath: 'file:///b.pdf',
          mimeType: 'application/pdf',
          fileName: 'b.pdf',
          fieldKey: 'bill',
        },
      ],
    });

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => online,
    });

    const result = await engine.processQueue();
    expect(result.processed).toBe(1);
    expect(result.errors).toBe(0);
    expect(uploaded).toEqual(['file:///a.jpg', 'file:///b.pdf']);
    expect(syncedKeys).toEqual([txn.idempotencyKey]);

    const synced = await queue.getTransaction(txn.id);
    expect(synced?.status).toBe(OfflineTxnStatus.Synced);
    expect(synced?.serverRecordId).toBe(`srv-${txn.id}`);
    expect(synced?.serverTimestamp).toBe('2026-07-17T09:00:00.000Z');

    const media = await queue.getMedia(txn.id);
    expect(media.every((m) => m.uploadStatus === 'uploaded')).toBe(true);
  });

  it('does not sync transaction when media upload fails', async () => {
    await queue.enqueue({
      type: 'demo',
      label: 'Bad media',
      endpoint: '/x',
      payload: {},
      media: [
        {
          localPath: 'file:///bad.jpg',
          mimeType: 'image/jpeg',
          fileName: 'bad.jpg',
          fieldKey: 'photo',
        },
      ],
    });

    transport.uploadMedia = async () => {
      throw new Error('S3 unavailable');
    };

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => online,
    });

    const result = await engine.processQueue();
    expect(result.errors).toBe(1);
    expect(syncedKeys).toHaveLength(0);

    const items = await queue.listForUi();
    expect(items[0]?.status).toBe(OfflineTxnStatus.Failed);
    expect(items[0]?.lastError).toMatch(/Media upload failed/);
  });

  it('marks conflict without auto-duplicating on 409', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Conflict',
      endpoint: '/x',
      payload: {},
    });

    transport.syncTransaction = async () => {
      throw createSyncConflictError('Already exists', '2026-07-17T10:00:00.000Z');
    };

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => online,
    });

    await engine.processQueue();
    const row = await queue.getTransaction(txn.id);
    expect(row?.status).toBe(OfflineTxnStatus.Conflict);
    expect(row?.serverTimestamp).toBe('2026-07-17T10:00:00.000Z');

    // Second pass should not auto-process conflict
    const second = await engine.processQueue();
    expect(second.processed).toBe(0);
  });

  it('marks permanent validation errors and does not auto-retry them', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Invalid',
      endpoint: '/x',
      payload: {},
    });

    transport.syncTransaction = async () => {
      throw createSyncPermanentError(
        'receivedQuantity must be greater than 0',
        'VALIDATION_ERROR',
      );
    };

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => online,
    });

    await engine.processQueue();
    const row = await queue.getTransaction(txn.id);
    expect(row?.status).toBe(OfflineTxnStatus.Failed);
    expect(row?.failureKind).toBe(OfflineFailureKind.Permanent);
    expect(row?.lastErrorCode).toBe('VALIDATION_ERROR');

    const second = await engine.processQueue();
    expect(second.processed).toBe(0);

    // Manual retry is allowed; same idempotency key is preserved.
    await queue.manualRetry(txn.id);
    transport.syncTransaction = async (queued) => {
      syncedKeys.push(queued.idempotencyKey);
      return {
        serverRecordId: 'srv-fixed',
        serverTimestamp: '2026-07-17T12:00:00.000Z',
      };
    };
    await engine.processQueue();
    expect(syncedKeys).toEqual([txn.idempotencyKey]);
    expect((await queue.getTransaction(txn.id))?.status).toBe(
      OfflineTxnStatus.Synced,
    );
  });

  it('skips processing while offline', async () => {
    await queue.enqueue({
      type: 'demo',
      label: 'Offline',
      endpoint: '/x',
      payload: {},
    });
    online = false;

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => online,
    });

    const result = await engine.processQueue();
    expect(result.processed).toBe(0);
    expect(syncedKeys).toHaveLength(0);
  });

  it('retries safely after failure using the same idempotency key', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Retry',
      endpoint: '/x',
      payload: { n: 1 },
    });

    let calls = 0;
    transport.syncTransaction = async (row) => {
      calls += 1;
      syncedKeys.push(row.idempotencyKey);
      if (calls === 1) {
        throw new Error('temporary');
      }
      return {
        serverRecordId: 'srv-ok',
        serverTimestamp: '2026-07-17T11:00:00.000Z',
      };
    };

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => online,
    });

    await engine.processQueue();
    expect((await queue.getTransaction(txn.id))?.status).toBe(
      OfflineTxnStatus.Failed,
    );

    await queue.manualRetry(txn.id);
    await engine.processQueue();

    const synced = await queue.getTransaction(txn.id);
    expect(synced?.status).toBe(OfflineTxnStatus.Synced);
    expect(syncedKeys).toEqual([txn.idempotencyKey, txn.idempotencyKey]);
  });
});
