import AsyncStorage from '@react-native-async-storage/async-storage';

export const LEAD_DRAFT_STORAGE_KEY = '@luxaria/lead-capture-draft';

export type LeadCaptureDraft = {
  fullName: string;
  phone: string;
  source: string;
  savedAt: string;
};

export async function saveLeadDraft(draft: LeadCaptureDraft): Promise<void> {
  await AsyncStorage.setItem(LEAD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export async function loadLeadDraft(): Promise<LeadCaptureDraft | null> {
  const raw = await AsyncStorage.getItem(LEAD_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LeadCaptureDraft;
  } catch {
    return null;
  }
}

export async function clearLeadDraft(): Promise<void> {
  await AsyncStorage.removeItem(LEAD_DRAFT_STORAGE_KEY);
}
