import { OfflineQueueService } from '../queueService';
import { createMemoryOfflineRepository } from '../repository';
import { OfflineSyncEngine } from '../syncEngine';
import type { OfflineSyncTransport } from '../transport';
import { OfflineTxnStatus } from '../types';

/**
 * Offline-sync integration: enqueue → processQueue → marked synced with idempotency key.
 */
describe('Offline sync integration', () => {
  it('syncs a queued transaction exactly once', async () => {
    let n = 0;
    const queue = new OfflineQueueService(
      createMemoryOfflineRepository(),
      { now: () => new Date('2026-07-20T08:00:00.000Z') },
      () => `offline-${++n}`,
    );
    await queue.init();

    const synced: string[] = [];
    const transport: OfflineSyncTransport = {
      async uploadMedia() {
        return 'doc-1';
      },
      async syncTransaction(txn) {
        synced.push(txn.idempotencyKey);
        return {
          serverRecordId: `srv-${txn.id}`,
          serverTimestamp: '2026-07-20T08:05:00.000Z',
          response: { ok: true },
        };
      },
    };

    const txn = await queue.enqueue({
      type: 'goods_receipt',
      label: 'GRN offline',
      projectId: 'proj-1',
      endpoint: '/goods-receipts',
      payload: { poId: 'po-1' },
      media: [],
    });

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => true,
    });
    const result = await engine.processQueue();

    expect(result.processed).toBe(1);
    expect(result.errors).toBe(0);
    expect(synced).toEqual([txn.idempotencyKey]);

    const after = await queue.getTransaction(txn.id);
    expect(after?.status).toBe(OfflineTxnStatus.Synced);
  });
});
