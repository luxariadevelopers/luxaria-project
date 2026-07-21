import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearLeadDraft,
  LEAD_DRAFT_STORAGE_KEY,
  loadLeadDraft,
  saveLeadDraft,
} from '../leadDraftStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('leadDraftStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and loads a lead capture draft', async () => {
    const draft = {
      fullName: 'Priya Sharma',
      phone: '9876543210',
      source: 'walk_in',
      savedAt: '2026-07-21T08:00:00.000Z',
    };
    await saveLeadDraft(draft);
    await expect(loadLeadDraft()).resolves.toEqual(draft);
  });

  it('clears stored draft', async () => {
    await saveLeadDraft({
      fullName: 'Test',
      phone: '1',
      source: 'other',
      savedAt: '2026-07-21T08:00:00.000Z',
    });
    await clearLeadDraft();
    await expect(AsyncStorage.getItem(LEAD_DRAFT_STORAGE_KEY)).resolves.toBeNull();
  });
});
