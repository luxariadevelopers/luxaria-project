import { isCommitmentOverdue } from './overdue';
import { CommitmentStatus, type PublicCommitment } from './types';

/** Client-only amendment / overdue filters (Nest list has status + participant only). */
export type CommitmentAmendmentFilter =
  | 'all'
  | 'current'
  | 'amendments'
  | 'superseded';

export type CommitmentClientFilters = {
  overdueOnly: boolean;
  amendment: CommitmentAmendmentFilter;
};

export function hasCommitmentClientFilters(
  filters: CommitmentClientFilters,
): boolean {
  return filters.overdueOnly || filters.amendment !== 'all';
}

/**
 * Apply amendment + overdue filters after fetch.
 * - `current` — exclude superseded (active version track)
 * - `amendments` — version > 1 (includes draft/submitted amendment rows)
 * - `superseded` — prior approved versions closed by amendment
 */
export function applyCommitmentClientFilters(
  rows: readonly PublicCommitment[],
  filters: CommitmentClientFilters,
  asOf: Date = new Date(),
): PublicCommitment[] {
  return rows.filter((row) => {
    if (filters.overdueOnly && !isCommitmentOverdue(row, asOf)) {
      return false;
    }
    switch (filters.amendment) {
      case 'current':
        return row.status !== CommitmentStatus.Superseded;
      case 'amendments':
        return row.version > 1;
      case 'superseded':
        return row.status === CommitmentStatus.Superseded;
      case 'all':
      default:
        return true;
    }
  });
}
