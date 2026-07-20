import type { StockCountDraft } from './types';

export type DraftStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const memory = new Map<string, string>();

/** Default in-memory store (tests + environments without AsyncStorage). */
export const memoryDraftStorage: DraftStorage = {
  async getItem(key) {
    return memory.get(key) ?? null;
  },
  async setItem(key, value) {
    memory.set(key, value);
  },
  async removeItem(key) {
    memory.delete(key);
  },
};

export function draftStorageKey(projectId: string): string {
  return `luxaria.stockCount.draft.${projectId}`;
}

export async function loadStockCountDraft(
  projectId: string,
  storage: DraftStorage = memoryDraftStorage,
): Promise<StockCountDraft | null> {
  const raw = await storage.getItem(draftStorageKey(projectId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StockCountDraft;
    if (parsed.projectId !== projectId || !Array.isArray(parsed.lines)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveStockCountDraft(
  draft: StockCountDraft,
  storage: DraftStorage = memoryDraftStorage,
): Promise<void> {
  await storage.setItem(
    draftStorageKey(draft.projectId),
    JSON.stringify(draft),
  );
}

export async function clearStockCountDraft(
  projectId: string,
  storage: DraftStorage = memoryDraftStorage,
): Promise<void> {
  await storage.removeItem(draftStorageKey(projectId));
}

/** Clears memory store between tests. */
export function resetMemoryDraftStorage(): void {
  memory.clear();
}
