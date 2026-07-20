import { journalStatusCatalog } from '@/status';
import type { PublicJournalEntry } from './types';
import { JournalStatus } from './types';

/**
 * Posted / reversed / cancelled journals cannot be edited (Nest immutability).
 * Corrections to posted entries require reversal only.
 */
export function isJournalImmutable(status: string): boolean {
  return journalStatusCatalog.isImmutable(status);
}

export function isJournalEditable(status: string): boolean {
  return journalStatusCatalog.isEditable(status);
}

export type JournalDetailActionId =
  | 'submit'
  | 'post'
  | 'reverse'
  | 'cancel';

export function resolveJournalDetailActions(
  journal: Pick<PublicJournalEntry, 'status' | 'reversedBy'>,
  caps: {
    canCreate: boolean;
    canPost: boolean;
    canReverse: boolean;
    canCancel: boolean;
  },
): JournalDetailActionId[] {
  const actions: JournalDetailActionId[] = [];
  const { status } = journal;

  if (caps.canCreate && status === JournalStatus.Draft) {
    actions.push('submit');
  }
  if (
    caps.canPost &&
    (status === JournalStatus.Draft ||
      status === JournalStatus.PendingApproval)
  ) {
    actions.push('post');
  }
  if (
    caps.canReverse &&
    status === JournalStatus.Posted &&
    !journal.reversedBy
  ) {
    actions.push('reverse');
  }
  if (
    caps.canCancel &&
    (status === JournalStatus.Draft ||
      status === JournalStatus.PendingApproval)
  ) {
    actions.push('cancel');
  }

  return actions;
}
