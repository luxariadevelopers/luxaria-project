import { CommitmentStatus, type PublicCommitment } from './types';

/**
 * Client overdue signal matching Nest stub intent
 * (`evaluateOverdueCommitmentAlerts`): dueDate < as-of and pending > 0
 * on an approved commitment. Nest does not yet emit overdue alerts.
 */
export function isCommitmentOverdue(
  row: Pick<
    PublicCommitment,
    'status' | 'dueDate' | 'pendingAmount'
  >,
  asOf: Date = new Date(),
): boolean {
  if (row.status !== CommitmentStatus.Approved) return false;
  if (!(row.pendingAmount > 0)) return false;
  if (!row.dueDate) return false;
  const due = Date.parse(row.dueDate);
  if (Number.isNaN(due)) return false;
  const asOfDay = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  );
  const dueDay = Date.UTC(
    new Date(due).getUTCFullYear(),
    new Date(due).getUTCMonth(),
    new Date(due).getUTCDate(),
  );
  return dueDay < asOfDay;
}
