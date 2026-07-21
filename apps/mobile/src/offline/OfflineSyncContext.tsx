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
import { useAuth } from '@/auth/AuthContext';
import { useNetwork } from '@/context/NetworkContext';
import { useProject } from '@/context/ProjectContext';
import {
  OfflineQueueService,
  QueueAccessError,
  type QueueActorContext,
} from './queueService';
import { createMemoryOfflineRepository } from './repository';
import { createSqliteOfflineRepository } from './sqliteRepository';
import { OfflineSyncEngine } from './syncEngine';
import { createHttpOfflineTransport } from './transport';
import type {
  EnqueueTransactionInput,
  OfflineMedia,
  OfflineTransaction,
} from './types';

export type QueueItem = OfflineTransaction & { media: OfflineMedia[] };

type OfflineSyncContextValue = {
  ready: boolean;
  items: QueueItem[];
  activeCount: number;
  isSyncing: boolean;
  lastError: string | null;
  accessDenied: boolean;
  refresh: () => Promise<void>;
  enqueue: (input: EnqueueTransactionInput) => Promise<OfflineTransaction>;
  processQueue: () => Promise<void>;
  retry: (id: string) => Promise<void>;
  /**
   * Discard a draft after UI confirmation. Pass `confirmed: true` only from an
   * explicit user confirm dialog — never auto-discard.
   */
  discardDraft: (id: string, confirmed: boolean) => Promise<void>;
  getItemForActor: (id: string) => Promise<QueueItem | null>;
  /** Dev helper — enqueue a sample offline row to exercise the queue UI. */
  enqueueDemo: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useNetwork();
  const { user, access } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const isOnlineRef = useRef(isOnline);
  const queueRef = useRef<OfflineQueueService | null>(null);
  const engineRef = useRef<OfflineSyncEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const actor = useMemo<QueueActorContext | null>(() => {
    if (!user?.id) return null;
    const accessibleProjectIds = new Set(projects.map((p) => p.id));
    if (selectedProjectId) {
      accessibleProjectIds.add(selectedProjectId);
    }
    return {
      userId: user.id,
      accessibleProjectIds,
      bypassProjectAccess: Boolean(access?.bypassPermissions),
    };
  }, [user?.id, projects, selectedProjectId, access?.bypassPermissions]);

  const actorRef = useRef(actor);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const refresh = useCallback(async () => {
    const queue = queueRef.current;
    if (!queue) return;
    const userId = actorRef.current?.userId ?? null;
    const next = await queue.listForUi(userId);
    setItems(next);
    setActiveCount(await queue.countActive(userId));
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

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, actor?.userId, refresh]);

  const processQueue = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !isOnlineRef.current) return;
    setIsSyncing(true);
    setLastError(null);
    setAccessDenied(false);
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
      const txn = await queue.enqueue({
        ...input,
        createdByUserId:
          input.createdByUserId ?? actorRef.current?.userId ?? null,
        companyId: input.companyId ?? user?.companyId ?? null,
        action: input.action ?? input.type ?? null,
      });
      await refresh();
      if (isOnlineRef.current) {
        void processQueue();
      }
      return txn;
    },
    [processQueue, refresh, user?.companyId],
  );

  const retry = useCallback(
    async (id: string) => {
      const queue = queueRef.current;
      const currentActor = actorRef.current;
      if (!queue || !currentActor) {
        setAccessDenied(true);
        setLastError('Sign in to retry your own queued records');
        return;
      }
      setAccessDenied(false);
      setLastError(null);
      try {
        await queue.manualRetry(id, currentActor);
        await refresh();
        if (isOnlineRef.current) {
          await processQueue();
        }
      } catch (error) {
        if (error instanceof QueueAccessError && error.code === 'forbidden') {
          setAccessDenied(true);
        }
        setLastError(
          error instanceof Error ? error.message : 'Retry was blocked',
        );
      }
    },
    [processQueue, refresh],
  );

  const discardDraft = useCallback(
    async (id: string, confirmed: boolean) => {
      const queue = queueRef.current;
      const currentActor = actorRef.current;
      if (!queue || !currentActor) {
        setAccessDenied(true);
        setLastError('Sign in to discard your own queued records');
        return;
      }
      setAccessDenied(false);
      setLastError(null);
      try {
        await queue.discardDraft(id, currentActor, { confirmed });
        await refresh();
      } catch (error) {
        if (error instanceof QueueAccessError && error.code === 'forbidden') {
          setAccessDenied(true);
        }
        setLastError(
          error instanceof Error ? error.message : 'Discard was blocked',
        );
        throw error;
      }
    },
    [refresh],
  );

  const getItemForActor = useCallback(async (id: string) => {
    const queue = queueRef.current;
    const currentActor = actorRef.current;
    if (!queue || !currentActor) {
      setAccessDenied(true);
      return null;
    }
    try {
      setAccessDenied(false);
      return await queue.getForActor(id, currentActor);
    } catch (error) {
      if (error instanceof QueueAccessError && error.code === 'forbidden') {
        setAccessDenied(true);
      }
      setLastError(
        error instanceof Error ? error.message : 'Unable to open queue item',
      );
      return null;
    }
  }, []);

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
      accessDenied,
      refresh,
      enqueue,
      processQueue,
      retry,
      discardDraft,
      getItemForActor,
      enqueueDemo,
    }),
    [
      ready,
      items,
      activeCount,
      isSyncing,
      lastError,
      accessDenied,
      refresh,
      enqueue,
      processQueue,
      retry,
      discardDraft,
      getItemForActor,
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
