import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { OfflineQueueService } from './queueService';
import { createMemoryOfflineRepository } from './repository';
import { createSqliteOfflineRepository } from './sqliteRepository';
import { OfflineSyncEngine } from './syncEngine';
import { createHttpOfflineTransport } from './transport';
import type {
  EnqueueTransactionInput,
  OfflineMedia,
  OfflineTransaction,
} from './types';

type QueueItem = OfflineTransaction & { media: OfflineMedia[] };

type OfflineSyncContextValue = {
  ready: boolean;
  items: QueueItem[];
  activeCount: number;
  isSyncing: boolean;
  lastError: string | null;
  refresh: () => Promise<void>;
  enqueue: (input: EnqueueTransactionInput) => Promise<OfflineTransaction>;
  processQueue: () => Promise<void>;
  retry: (id: string) => Promise<void>;
  /** Dev helper — enqueue a sample offline row to exercise the queue UI. */
  enqueueDemo: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useNetwork();
  const isOnlineRef = useRef(isOnline);
  const queueRef = useRef<OfflineQueueService | null>(null);
  const engineRef = useRef<OfflineSyncEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const refresh = useCallback(async () => {
    const queue = queueRef.current;
    if (!queue) return;
    const next = await queue.listForUi();
    setItems(next);
    setActiveCount(await queue.countActive());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const attachEngine = (queue: OfflineQueueService) => {
      queueRef.current = queue;
      engineRef.current = new OfflineSyncEngine({
        queue,
        transport: createHttpOfflineTransport(),
        isOnline: () => isOnlineRef.current,
        onChange: () => {
          void refresh();
        },
      });
    };

    (async () => {
      const sqliteQueue = new OfflineQueueService(createSqliteOfflineRepository());
      try {
        await sqliteQueue.init();
        if (cancelled) return;
        attachEngine(sqliteQueue);
        setReady(true);
        await refresh();
      } catch (error) {
        const memoryQueue = new OfflineQueueService(
          createMemoryOfflineRepository(),
        );
        await memoryQueue.init();
        if (cancelled) return;
        attachEngine(memoryQueue);
        setReady(true);
        setLastError(
          error instanceof Error
            ? `SQLite unavailable, using in-memory queue: ${error.message}`
            : 'SQLite unavailable, using in-memory queue',
        );
        await refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const processQueue = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !isOnlineRef.current) return;
    setIsSyncing(true);
    setLastError(null);
    try {
      const result = await engine.processQueue();
      if (result.errors > 0) {
        setLastError(`${result.errors} item(s) failed to sync`);
      }
      await refresh();
    } catch (error) {
      setLastError(
        error instanceof Error ? error.message : 'Sync engine error',
      );
    } finally {
      setIsSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (!ready || !isOnline) return;
    void processQueue();
  }, [ready, isOnline, processQueue]);

  const enqueue = useCallback(
    async (input: EnqueueTransactionInput) => {
      const queue = queueRef.current;
      if (!queue) {
        throw new Error('Offline queue is not ready');
      }
      const txn = await queue.enqueue(input);
      await refresh();
      if (isOnlineRef.current) {
        void processQueue();
      }
      return txn;
    },
    [processQueue, refresh],
  );

  const retry = useCallback(
    async (id: string) => {
      const queue = queueRef.current;
      if (!queue) return;
      await queue.manualRetry(id);
      await refresh();
      if (isOnlineRef.current) {
        await processQueue();
      }
    },
    [processQueue, refresh],
  );

  const enqueueDemo = useCallback(async () => {
    await enqueue({
      type: 'demo.offline',
      label: 'Demo offline transaction',
      endpoint: '/health',
      method: 'POST',
      payload: { note: 'offline-demo', demo: true },
      media: [
        {
          localPath: 'file:///demo/photo.jpg',
          mimeType: 'image/jpeg',
          fileName: 'photo.jpg',
          fieldKey: 'photo',
          uploadMeta: {
            module: 'mobile_offline',
            entityType: 'demo',
            documentType: 'photo',
            size: 1024,
          },
        },
      ],
    });
  }, [enqueue]);

  const value = useMemo<OfflineSyncContextValue>(
    () => ({
      ready,
      items,
      activeCount,
      isSyncing,
      lastError,
      refresh,
      enqueue,
      processQueue,
      retry,
      enqueueDemo,
    }),
    [
      ready,
      items,
      activeCount,
      isSyncing,
      lastError,
      refresh,
      enqueue,
      processQueue,
      retry,
      enqueueDemo,
    ],
  );

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error('useOfflineSync must be used within OfflineSyncProvider');
  }
  return ctx;
}
