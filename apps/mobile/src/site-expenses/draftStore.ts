import type { SiteExpenseLocalDraft } from './types';

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
  return `luxaria.siteExpense.drafts.${projectId}`;
}

export function createSiteExpenseDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isValidDraft(
  value: unknown,
  projectId: string,
): value is SiteExpenseLocalDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as SiteExpenseLocalDraft;
  return (
    typeof draft.id === 'string' &&
    draft.id.length > 0 &&
    draft.projectId === projectId &&
    typeof draft.expenseDate === 'string' &&
    typeof draft.amount === 'string' &&
    typeof draft.paidTo === 'string' &&
    typeof draft.purpose === 'string' &&
    typeof draft.updatedAt === 'string'
  );
}

async function readDraftList(
  projectId: string,
  storage: DraftStorage,
): Promise<SiteExpenseLocalDraft[]> {
  const raw = await storage.getItem(draftStorageKey(projectId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SiteExpenseLocalDraft =>
      isValidDraft(item, projectId),
    );
  } catch {
    return [];
  }
}

async function writeDraftList(
  projectId: string,
  drafts: SiteExpenseLocalDraft[],
  storage: DraftStorage,
): Promise<void> {
  if (drafts.length === 0) {
    await storage.removeItem(draftStorageKey(projectId));
    return;
  }
  await storage.setItem(draftStorageKey(projectId), JSON.stringify(drafts));
}

export async function loadSiteExpenseDrafts(
  projectId: string,
  storage: DraftStorage = memoryDraftStorage,
): Promise<SiteExpenseLocalDraft[]> {
  const drafts = await readDraftList(projectId, storage);
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadSiteExpenseDraft(
  projectId: string,
  draftId: string,
  storage: DraftStorage = memoryDraftStorage,
): Promise<SiteExpenseLocalDraft | null> {
  const drafts = await readDraftList(projectId, storage);
  return drafts.find((d) => d.id === draftId) ?? null;
}

export async function saveSiteExpenseDraft(
  draft: SiteExpenseLocalDraft,
  storage: DraftStorage = memoryDraftStorage,
): Promise<void> {
  if (!draft.projectId || !draft.id) {
    throw new Error('projectId and id are required');
  }
  const drafts = await readDraftList(draft.projectId, storage);
  const next = drafts.filter((d) => d.id !== draft.id);
  next.push(draft);
  await writeDraftList(draft.projectId, next, storage);
}

export async function clearSiteExpenseDraft(
  projectId: string,
  draftId: string,
  storage: DraftStorage = memoryDraftStorage,
): Promise<void> {
  const drafts = await readDraftList(projectId, storage);
  const next = drafts.filter((d) => d.id !== draftId);
  await writeDraftList(projectId, next, storage);
}

export async function clearAllSiteExpenseDrafts(
  projectId: string,
  storage: DraftStorage = memoryDraftStorage,
): Promise<void> {
  await storage.removeItem(draftStorageKey(projectId));
}

/** Clears memory store between tests. */
export function resetMemoryDraftStorage(): void {
  memory.clear();
}
