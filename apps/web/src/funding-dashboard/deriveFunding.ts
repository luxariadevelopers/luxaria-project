import { CommitmentStatus, type PublicCommitment } from '@/commitments/types';
import type { CommitmentSummary } from '@/commitments/types';
import type { FundingCardModel, ParticipantFundingRow } from './types';

/** Calendar-year start for the as-of date (utilisation period `from`). */
export function periodFromForDate(isoDate: string): string {
  const year = isoDate.slice(0, 4);
  if (!/^\d{4}$/.test(year)) {
    return isoDate;
  }
  return `${year}-01-01`;
}

export function buildFundingCards(
  summary: CommitmentSummary | undefined,
): FundingCardModel[] {
  const committed = summary?.committedAmount ?? 0;
  const received = summary?.receivedAmount ?? 0;
  const pending = summary?.pendingAmount ?? Math.max(0, committed - received);
  return [
    {
      id: 'committed',
      title: 'Committed',
      amount: committed,
      hint: `${summary?.approvedCommitmentCount ?? 0} approved commitment(s)`,
    },
    {
      id: 'received',
      title: 'Received',
      amount: received,
      hint: 'Against approved commitments',
    },
    {
      id: 'pending',
      title: 'Pending',
      amount: pending,
      hint: 'Committed − received',
    },
    {
      id: 'gap',
      title: 'Funding gap',
      amount: pending,
      hint:
        pending > 0
          ? 'Outstanding vs approved commitments'
          : 'No gap on approved commitments',
    },
  ];
}

/**
 * Aggregate approved commitment rows by participant for the chart.
 * Uses Nest list rows (status=approved) — not inventing a dashboard endpoint.
 */
export function aggregateParticipantFunding(
  commitments: readonly PublicCommitment[],
  labelFor: (participantId: string) => string,
): ParticipantFundingRow[] {
  const map = new Map<string, ParticipantFundingRow>();

  for (const row of commitments) {
    if (row.status !== CommitmentStatus.Approved) continue;
    const existing = map.get(row.participantId);
    if (existing) {
      existing.committedAmount += row.commitmentAmount;
      existing.receivedAmount += row.receivedAmount;
      existing.pendingAmount += row.pendingAmount;
    } else {
      map.set(row.participantId, {
        participantId: row.participantId,
        label: labelFor(row.participantId),
        committedAmount: row.commitmentAmount,
        receivedAmount: row.receivedAmount,
        pendingAmount: row.pendingAmount,
      });
    }
  }

  return [...map.values()].sort(
    (a, b) => b.committedAmount - a.committedAmount,
  );
}

export function fundingFiltersReady(filters: {
  date: string;
  projectId: string;
}): boolean {
  return Boolean(filters.date.trim()) && Boolean(filters.projectId.trim());
}
