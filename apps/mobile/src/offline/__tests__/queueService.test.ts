import {
  MAX_SYNC_ATTEMPTS,
  OfflineQueueService,
  canAutoProcess,
  computeNextRetryAt,
  isUploadingStuck,
} from '../queueService';
import { createMemoryOfflineRepository } from '../repository';
import { OfflineTxnStatus } from '../types';

describe('OfflineQueueService', () => {
  let ids: string[];
  let now: Date;
  let queue: OfflineQueueService;

  beforeEach(async () => {
    ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    ];
    now = new Date('2026-07-17T06:00:00.000Z');
    let i = 0;
    queue = new OfflineQueueService(
      createMemoryOfflineRepository(),
      { now: () => now },
      () => ids[i++] ?? `extra-${i}`,
    );
    await queue.init();
  });

  it('enqueues with UUID, idempotency key, device timestamp, and local media paths', async () => {
    const txn = await queue.enqueue({
      type: 'site_expense.voucher',
      label: 'Cement bags',
      projectId: 'proj-1',
      endpoint: '/site-expense-vouchers',
      payload: { amount: 500 },
      media: [
        {
          localPath: 'file:///cache/bill.jpg',
          mimeType: 'image/jpeg',
          fileName: 'bill.jpg',
          fieldKey: 'bill',
        },
      ],
    });

    expect(txn.id).toBe(ids[0]);
    expect(txn.idempotencyKey).toBe(`mobile-txn:${ids[0]}`);
    expect(txn.status).toBe(OfflineTxnStatus.Pending);
    expect(txn.deviceTimestamp).toBe(now.toISOString());
    expect(txn.serverTimestamp).toBeNull();

    const media = await queue.getMedia(txn.id);
    expect(media).toHaveLength(1);
    expect(media[0]?.localPath).toBe('file:///cache/bill.jpg');
    expect(media[0]?.uploadStatus).toBe('pending');
  });

  it('rejects duplicate idempotency keys to prevent duplicate server records', async () => {
    await queue.enqueue({
      type: 'demo',
      label: 'A',
      endpoint: '/x',
      payload: {},
      idempotencyKey: 'fixed-key',
    });

    await expect(
      queue.enqueue({
        type: 'demo',
        label: 'B',
        endpoint: '/x',
        payload: {},
        idempotencyKey: 'fixed-key',
      }),
    ).rejects.toThrow(/Duplicate idempotency key/);
  });

  it('claims pending work as uploading atomically', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Claim me',
      endpoint: '/x',
      payload: {},
    });

    const claimed = await queue.claimForSync(txn.id);
    expect(claimed?.status).toBe(OfflineTxnStatus.Uploading);

    const second = await queue.claimForSync(txn.id);
    expect(second).toBeNull();
  });

  it('marks failed with backoff and allows manual retry', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Fail me',
      endpoint: '/x',
      payload: {},
    });
    await queue.claimForSync(txn.id);
    await queue.markFailed(txn.id, 'Network timeout');

    const failed = await queue.getTransaction(txn.id);
    expect(failed?.status).toBe(OfflineTxnStatus.Failed);
    expect(failed?.attemptCount).toBe(1);
    expect(failed?.lastError).toBe('Network timeout');
    expect(failed?.nextRetryAt).toBe(computeNextRetryAt(1, now));

    // Not due yet
    expect(canAutoProcess(failed!, now)).toBe(false);

    const retried = await queue.manualRetry(txn.id);
    expect(retried?.status).toBe(OfflineTxnStatus.Pending);
    expect(retried?.lastError).toBeNull();
    expect(retried?.nextRetryAt).toBeNull();
  });

  it('marks conflict and only retries manually', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Conflict',
      endpoint: '/x',
      payload: {},
    });
    await queue.claimForSync(txn.id);
    await queue.markConflict(
      txn.id,
      'Server conflict',
      '2026-07-17T07:00:00.000Z',
    );

    const conflicted = await queue.getTransaction(txn.id);
    expect(conflicted?.status).toBe(OfflineTxnStatus.Conflict);
    expect(conflicted?.serverTimestamp).toBe('2026-07-17T07:00:00.000Z');
    expect(canAutoProcess(conflicted!, now)).toBe(false);

    const ids = await queue.getProcessableIds();
    expect(ids).not.toContain(txn.id);

    await queue.manualRetry(txn.id);
    const processable = await queue.getProcessableIds();
    expect(processable).toContain(txn.id);
  });

  it('records server timestamp on sync success', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Sync me',
      endpoint: '/x',
      payload: {},
    });
    await queue.claimForSync(txn.id);
    await queue.markSynced(txn.id, {
      serverRecordId: 'srv-1',
      serverTimestamp: '2026-07-17T08:00:00.000Z',
    });

    const synced = await queue.getTransaction(txn.id);
    expect(synced?.status).toBe(OfflineTxnStatus.Synced);
    expect(synced?.serverRecordId).toBe('srv-1');
    expect(synced?.serverTimestamp).toBe('2026-07-17T08:00:00.000Z');
    expect(await queue.countActive()).toBe(0);
  });

  it('recovers stuck uploading rows for safe retry', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Stuck',
      endpoint: '/x',
      payload: {},
    });
    await queue.claimForSync(txn.id);

    now = new Date('2026-07-17T06:20:00.000Z');
    const uploading = await queue.getTransaction(txn.id);
    expect(isUploadingStuck(uploading!, now)).toBe(true);

    const processable = await queue.getProcessableIds();
    expect(processable).toContain(txn.id);
    const recovered = await queue.getTransaction(txn.id);
    expect(recovered?.status).toBe(OfflineTxnStatus.Pending);
  });

  it('stops auto-retry after max attempts', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Exhaust',
      endpoint: '/x',
      payload: {},
    });

    for (let n = 0; n < MAX_SYNC_ATTEMPTS; n += 1) {
      await queue.claimForSync(txn.id);
      await queue.markFailed(txn.id, 'fail');
      now = new Date(now.getTime() + 60 * 60 * 1000);
      await queue.manualRetry(txn.id);
    }

    await queue.claimForSync(txn.id);
    await queue.markFailed(txn.id, 'final');
    const final = await queue.getTransaction(txn.id);
    expect(final?.attemptCount).toBeGreaterThanOrEqual(MAX_SYNC_ATTEMPTS);
    expect(final?.lastError).toMatch(/max retries reached/);
    expect(canAutoProcess(final!, now)).toBe(false);
  });

  it('builds sync payload with media document ids and device timestamp', async () => {
    const txn = await queue.enqueue({
      type: 'demo',
      label: 'Payload',
      endpoint: '/x',
      payload: { amount: 10 },
      media: [
        {
          localPath: 'file:///a.jpg',
          mimeType: 'image/jpeg',
          fileName: 'a.jpg',
          fieldKey: 'photo',
        },
      ],
    });
    const media = await queue.getMedia(txn.id);
    await queue.markMediaUploaded(media[0]!.id, 'doc-99');
    const fresh = await queue.getMedia(txn.id);
    const payload = queue.buildSyncPayload(txn, fresh);

    expect(payload.amount).toBe(10);
    expect(payload.photo).toBe('doc-99');
    expect(payload.attachments).toEqual({ photo: 'doc-99' });
    expect(payload.clientTransactionId).toBe(txn.id);
    expect(payload.idempotencyKey).toBe(txn.idempotencyKey);
    expect(payload.deviceTimestamp).toBe(txn.deviceTimestamp);
  });
});
