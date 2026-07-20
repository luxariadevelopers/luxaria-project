import type { AllocationLine } from './buildAllocationSchedule';

export type VersionComparisonRow = {
  participantKey: string;
  label: string;
  approvedProfitShare: number;
  proposedProfitShare: number;
  delta: number;
  changed: boolean;
  pendingVersion: number | null;
  approvedVersion: number | null;
  pendingStatus: AllocationLine['pendingStatus'];
};

const DELTA_EPS = 0.0001;

/**
 * Compare approved (immutable) vs proposed draft/submitted profit shares.
 */
export function buildVersionComparison(
  lines: readonly AllocationLine[],
): VersionComparisonRow[] {
  return lines.map((line) => {
    const delta = line.deltaProfitShare;
    return {
      participantKey: line.participantKey,
      label: line.label,
      approvedProfitShare: line.approvedProfitShare,
      proposedProfitShare: line.proposedProfitShare,
      delta,
      changed: Math.abs(delta) > DELTA_EPS,
      pendingVersion: line.pending?.version ?? null,
      approvedVersion: line.approved?.version ?? null,
      pendingStatus: line.pendingStatus,
    };
  });
}

export function countChangedLines(
  rows: readonly VersionComparisonRow[],
): number {
  return rows.filter((row) => row.changed).length;
}
