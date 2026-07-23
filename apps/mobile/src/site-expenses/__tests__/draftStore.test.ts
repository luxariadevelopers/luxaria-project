import type { SiteExpenseLocalDraft } from '../types';
import { SiteExpensePaymentMode } from '../types';
import {
  clearAllSiteExpenseDrafts,
  clearSiteExpenseDraft,
  createSiteExpenseDraftId,
  draftStorageKey,
  loadSiteExpenseDraft,
  loadSiteExpenseDrafts,
  memoryDraftStorage,
  resetMemoryDraftStorage,
  saveSiteExpenseDraft,
} from '../draftStore';

const projectId = '507f1f77bcf86cd799439012';

function makeDraft(
  overrides: Partial<SiteExpenseLocalDraft> = {},
): SiteExpenseLocalDraft {
  const now = '2026-07-22T10:00:00.000Z';
  return {
    id: createSiteExpenseDraftId(),
    projectId,
    pettyCashAccountId: 'cash-1',
    expenseCategoryId: 'cat-1',
    expenseDate: '2026-07-22',
    amount: '1500',
    paidTo: 'Vendor A',
    purpose: 'Site materials',
    paymentMode: SiteExpensePaymentMode.Cash,
    mobileNumber: null,
    signatureUri: 'file:///sig.png',
    signatureName: 'sig.png',
    signatureMimeType: 'image/png',
    signatureSize: 2048,
    photoUri: null,
    photoName: null,
    photoMimeType: null,
    photoSize: null,
    requiresSignature: true,
    requiresBill: false,
    requiresPhoto: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('site expense draftStore', () => {
  beforeEach(() => {
    resetMemoryDraftStorage();
  });

  it('uses a project-scoped storage key', () => {
    expect(draftStorageKey(projectId)).toBe(
      `luxaria.siteExpense.drafts.${projectId}`,
    );
  });

  it('saves and loads a multi-draft list for a project', async () => {
    const a = makeDraft({
      id: 'draft-a',
      paidTo: 'A',
      updatedAt: '2026-07-22T09:00:00.000Z',
    });
    const b = makeDraft({
      id: 'draft-b',
      paidTo: 'B',
      updatedAt: '2026-07-22T11:00:00.000Z',
    });

    await saveSiteExpenseDraft(a, memoryDraftStorage);
    await saveSiteExpenseDraft(b, memoryDraftStorage);

    const loaded = await loadSiteExpenseDrafts(projectId, memoryDraftStorage);
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.id).toBe('draft-b');
    expect(loaded[1]?.id).toBe('draft-a');
    expect(loaded[0]?.signatureUri).toBe('file:///sig.png');
    expect(loaded[0]?.requiresSignature).toBe(true);
  });

  it('upserts the same draft id without duplicating', async () => {
    const draft = makeDraft({ id: 'draft-1', amount: '100' });
    await saveSiteExpenseDraft(draft, memoryDraftStorage);
    await saveSiteExpenseDraft(
      { ...draft, amount: '250', updatedAt: '2026-07-22T12:00:00.000Z' },
      memoryDraftStorage,
    );

    const loaded = await loadSiteExpenseDrafts(projectId, memoryDraftStorage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.amount).toBe('250');
  });

  it('loads a single draft by id', async () => {
    const draft = makeDraft({ id: 'draft-x', purpose: 'Resume me' });
    await saveSiteExpenseDraft(draft, memoryDraftStorage);

    const loaded = await loadSiteExpenseDraft(
      projectId,
      'draft-x',
      memoryDraftStorage,
    );
    expect(loaded?.purpose).toBe('Resume me');
    expect(
      await loadSiteExpenseDraft(projectId, 'missing', memoryDraftStorage),
    ).toBeNull();
  });

  it('clears one draft and leaves others', async () => {
    await saveSiteExpenseDraft(makeDraft({ id: 'keep' }), memoryDraftStorage);
    await saveSiteExpenseDraft(makeDraft({ id: 'drop' }), memoryDraftStorage);

    await clearSiteExpenseDraft(projectId, 'drop', memoryDraftStorage);

    const loaded = await loadSiteExpenseDrafts(projectId, memoryDraftStorage);
    expect(loaded.map((d) => d.id)).toEqual(['keep']);
  });

  it('clears all drafts for a project', async () => {
    await saveSiteExpenseDraft(makeDraft({ id: 'a' }), memoryDraftStorage);
    await clearAllSiteExpenseDrafts(projectId, memoryDraftStorage);
    expect(await loadSiteExpenseDrafts(projectId, memoryDraftStorage)).toEqual(
      [],
    );
  });

  it('ignores corrupt or foreign-project payloads', async () => {
    await memoryDraftStorage.setItem(
      draftStorageKey(projectId),
      JSON.stringify([
        { id: 'bad' },
        makeDraft({ id: 'ok' }),
        { ...makeDraft({ id: 'other' }), projectId: 'other-project' },
      ]),
    );

    const loaded = await loadSiteExpenseDrafts(projectId, memoryDraftStorage);
    expect(loaded.map((d) => d.id)).toEqual(['ok']);
  });
});
