/**
 * Source: `apps/backend/src/modules/journal/schemas/journal-entry.schema.ts`
 * Transitions: `journal.service.ts` (submit / post / reverse / cancel).
 */
import { createStatusCatalog } from './create-status-catalog';

export const JournalStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Posted: 'posted',
  Reversed: 'reversed',
  Cancelled: 'cancelled',
} as const;

export type JournalStatus = (typeof JournalStatus)[keyof typeof JournalStatus];

export const journalStatusCatalog = createStatusCatalog({
  values: Object.values(JournalStatus) as JournalStatus[],
  labels: {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    posted: 'Posted',
    reversed: 'Reversed',
    cancelled: 'Cancelled',
  },
  badgeVariants: {
    draft: 'neutral',
    pending_approval: 'warning',
    posted: 'success',
    reversed: 'info',
    cancelled: 'muted',
  },
  transitions: {
    draft: ['pending_approval', 'posted', 'cancelled'],
    pending_approval: ['posted', 'cancelled'],
    posted: ['reversed'],
    reversed: [],
    cancelled: [],
  },
  editable: ['draft'],
  immutable: ['posted', 'reversed', 'cancelled'],
});
