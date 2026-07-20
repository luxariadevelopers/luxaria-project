import type { OfflineMedia, OfflineTransaction, OfflineTxnStatus } from './types';

export type OfflineRepository = {
  init(): Promise<void>;
  insertTransaction(txn: OfflineTransaction): Promise<void>;
  insertMedia(media: OfflineMedia): Promise<void>;
  updateTransaction(
    id: string,
    patch: Partial<OfflineTransaction>,
  ): Promise<void>;
  updateMedia(id: string, patch: Partial<OfflineMedia>): Promise<void>;
  getTransaction(id: string): Promise<OfflineTransaction | null>;
  getMediaForTransaction(transactionId: string): Promise<OfflineMedia[]>;
  listTransactions(options?: {
    statuses?: OfflineTxnStatus[];
    excludeSynced?: boolean;
  }): Promise<OfflineTransaction[]>;
  countActive(): Promise<number>;
  /**
   * Atomically claim a transaction for processing if still in an allowed status.
   * Returns the claimed row, or null if another worker claimed it.
   */
  claimTransaction(
    id: string,
    fromStatuses: OfflineTxnStatus[],
    toStatus: OfflineTxnStatus,
    updatedAt: string,
  ): Promise<OfflineTransaction | null>;
};

export function createMemoryOfflineRepository(): OfflineRepository {
  const txns = new Map<string, OfflineTransaction>();
  const media = new Map<string, OfflineMedia>();

  return {
    async init() {
      // no-op
    },

    async insertTransaction(txn) {
      if (txns.has(txn.id)) {
        throw new Error(`Transaction ${txn.id} already exists`);
      }
      txns.set(txn.id, { ...txn });
    },

    async insertMedia(row) {
      if (media.has(row.id)) {
        throw new Error(`Media ${row.id} already exists`);
      }
      media.set(row.id, { ...row });
    },

    async updateTransaction(id, patch) {
      const current = txns.get(id);
      if (!current) {
        throw new Error(`Transaction ${id} not found`);
      }
      txns.set(id, { ...current, ...patch, id: current.id });
    },

    async updateMedia(id, patch) {
      const current = media.get(id);
      if (!current) {
        throw new Error(`Media ${id} not found`);
      }
      media.set(id, { ...current, ...patch, id: current.id });
    },

    async getTransaction(id) {
      const row = txns.get(id);
      return row ? { ...row } : null;
    },

    async getMediaForTransaction(transactionId) {
      return [...media.values()]
        .filter((m) => m.transactionId === transactionId)
        .map((m) => ({ ...m }));
    },

    async listTransactions(options) {
      let rows = [...txns.values()];
      if (options?.statuses?.length) {
        rows = rows.filter((r) => options.statuses!.includes(r.status));
      }
      if (options?.excludeSynced) {
        rows = rows.filter((r) => r.status !== 'synced');
      }
      return rows
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => ({ ...r }));
    },

    async countActive() {
      return [...txns.values()].filter((r) => r.status !== 'synced').length;
    },

    async claimTransaction(id, fromStatuses, toStatus, updatedAt) {
      const current = txns.get(id);
      if (!current || !fromStatuses.includes(current.status)) {
        return null;
      }
      const next = { ...current, status: toStatus, updatedAt };
      txns.set(id, next);
      return { ...next };
    },
  };
}
