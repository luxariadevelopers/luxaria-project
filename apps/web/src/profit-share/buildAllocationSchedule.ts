import {
  ParticipantApprovalStatus,
  type PublicProjectParticipant,
} from '@/project-participants/types';

export type AllocationLine = {
  participantKey: string;
  label: string;
  participantType: PublicProjectParticipant['participantType'];
  approved: PublicProjectParticipant | null;
  /** Open draft or submitted version superseding the approved line (if any). */
  pending: PublicProjectParticipant | null;
  approvedProfitShare: number;
  proposedProfitShare: number;
  approvedLossShare: number;
  proposedLossShare: number;
  deltaProfitShare: number;
  isEditable: boolean;
  pendingStatus: PublicProjectParticipant['status'] | null;
};

function pickLatestPending(
  rows: readonly PublicProjectParticipant[],
): PublicProjectParticipant | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => b.version - a.version)[0] ?? null;
}

/**
 * Merge active approved lines with open draft/submitted versions by participantKey.
 * Approved rows stay immutable; edits always target a pending version.
 */
export function buildAllocationSchedule(input: {
  active: readonly PublicProjectParticipant[];
  pending: readonly PublicProjectParticipant[];
}): AllocationLine[] {
  const pendingByKey = new Map<string, PublicProjectParticipant[]>();
  for (const row of input.pending) {
    if (
      row.status !== ParticipantApprovalStatus.Draft &&
      row.status !== ParticipantApprovalStatus.Submitted
    ) {
      continue;
    }
    const list = pendingByKey.get(row.participantKey) ?? [];
    list.push(row);
    pendingByKey.set(row.participantKey, list);
  }

  const keys = new Set<string>();
  for (const row of input.active) keys.add(row.participantKey);
  for (const key of pendingByKey.keys()) keys.add(key);

  const activeByKey = new Map(
    input.active.map((row) => [row.participantKey, row] as const),
  );

  return [...keys]
    .map((key) => {
      const approved = activeByKey.get(key) ?? null;
      const pending = pickLatestPending(pendingByKey.get(key) ?? []);
      const source = pending ?? approved;
      if (!source) return null;

      const approvedProfitShare = approved?.approvedProfitSharePercentage ?? 0;
      const proposedProfitShare =
        pending?.approvedProfitSharePercentage ?? approvedProfitShare;
      const approvedLossShare = approved?.lossSharePercentage ?? 0;
      const proposedLossShare =
        pending?.lossSharePercentage ?? approvedLossShare;

      return {
        participantKey: key,
        label:
          source.participantLabel?.trim() ||
          approved?.participantLabel?.trim() ||
          source.participantId,
        participantType: source.participantType,
        approved,
        pending,
        approvedProfitShare,
        proposedProfitShare,
        approvedLossShare,
        proposedLossShare,
        deltaProfitShare: proposedProfitShare - approvedProfitShare,
        isEditable: pending?.status === ParticipantApprovalStatus.Draft,
        pendingStatus: pending?.status ?? null,
      } satisfies AllocationLine;
    })
    .filter((row): row is AllocationLine => row != null)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function sumProposedProfitShare(
  lines: readonly AllocationLine[],
): number {
  return lines.reduce((sum, line) => sum + line.proposedProfitShare, 0);
}

export function sumApprovedProfitShare(
  lines: readonly AllocationLine[],
): number {
  return lines.reduce((sum, line) => sum + line.approvedProfitShare, 0);
}
