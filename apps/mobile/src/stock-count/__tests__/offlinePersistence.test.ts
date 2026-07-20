import { OfflineQueueService } from '@/offline/queueService';
import { createMemoryOfflineRepository } from '@/offline/repository';
import { OfflineSyncEngine } from '@/offline/syncEngine';
import type { OfflineSyncTransport } from '@/offline/transport';
import { OfflineTxnStatus } from '@/offline/types';
import { buildStockCountOfflineEnqueue } from '../buildStockCountOfflineEnqueue';
import {
  loadStockCountDraft,
  memoryDraftStorage,
  resetMemoryDraftStorage,
  saveStockCountDraft,
} from '../draftStore';
import type { CountLine } from '../types';

const projectId = '507f1f77bcf86cd799439012';
const materialId = '507f1f77bcf86cd799439011';

function makeLine(index: number, physical: number): CountLine {
  return {
    key: `line-${index}`,
    materialId: materialId.slice(0, -3) + String(100 + index).padStart(3, '0'),
    materialCode: `MAT-${index}`,
    materialName: `Material ${index}`,
    baseUnit: 'bag',
    systemQuantity: 100,
    physicalQuantity: physical,
    reason: physical === 100 ? '' : `Variance ${index}`,
    photoUri: physical === 100 ? null : `file:///photo-${index}.jpg`,
    photoName: physical === 100 ? null : `photo-${index}.jpg`,
    photoMimeType: physical === 100 ? null : 'image/jpeg',
    photoSize: physical === 100 ? null : 1024,
  };
}

describe('stock count offline persistence', () => {
  beforeEach(() => {
    resetMemoryDraftStorage();
  });

  it('persists a large count draft and reloads all lines', async () => {
    const lines = Array.from({ length: 250 }, (_, i) =>
      makeLine(i, i % 17 === 0 ? 90 : 100),
    );

    await saveStockCountDraft(
      {
        projectId,
        countDate: '2026-07-20',
        location: 'Yard A',
        notes: 'Cycle count',
        lines,
        updatedAt: '2026-07-20T10:00:00.000Z',
      },
      memoryDraftStorage,
    );

    const loaded = await loadStockCountDraft(projectId, memoryDraftStorage);
    expect(loaded?.lines).toHaveLength(250);
    expect(loaded?.location).toBe('Yard A');
    expect(loaded?.lines[0]?.materialCode).toBe('MAT-0');
    expect(loaded?.lines[249]?.materialName).toBe('Material 249');
  });

  it('enqueues create+submit and syncs media then create then submit', async () => {
    let n = 0;
    const queue = new OfflineQueueService(
      createMemoryOfflineRepository(),
      { now: () => new Date('2026-07-20T08:00:00.000Z') },
      () => `offline-${++n}`,
    );
    await queue.init();

    const calls: string[] = [];
    const transport: OfflineSyncTransport = {
      async uploadMedia(media) {
        calls.push(`upload:${media.fieldKey}`);
        return `doc-${media.fieldKey}`;
      },
      async syncTransaction(txn, payload) {
        calls.push(`sync:${txn.type}:${txn.endpoint}`);
        // Mimic production transport merge + submit follow-up contract
        const { mergeStockCountItemPhotos } = await import('../mergeItemPhotos');
        const body = mergeStockCountItemPhotos(payload);
        const items = body.items as Array<{ photo: string | null }>;
        expect(items[0]?.photo).toBe('doc-itemPhoto_0');
        calls.push('submit:/stock-counts/srv-1/submit');
        return {
          serverRecordId: 'srv-1',
          serverTimestamp: '2026-07-20T08:05:00.000Z',
        };
      },
    };

    const lines = [makeLine(0, 90)];
    // Fix materialId to valid ObjectId for validation
    lines[0]!.materialId = materialId;

    const enqueueInput = buildStockCountOfflineEnqueue({
      projectId,
      countDate: '2026-07-20',
      lines,
    });
    const txn = await queue.enqueue(enqueueInput);

    const engine = new OfflineSyncEngine({
      queue,
      transport,
      isOnline: () => true,
    });
    const result = await engine.processQueue();

    expect(result.processed).toBe(1);
    expect(result.errors).toBe(0);
    expect(calls).toEqual([
      'upload:itemPhoto_0',
      `sync:${txn.type}:/stock-counts`,
      'submit:/stock-counts/srv-1/submit',
    ]);

    const after = await queue.getTransaction(txn.id);
    expect(after?.status).toBe(OfflineTxnStatus.Synced);
  });
});
