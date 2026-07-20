import { describe, expect, it } from 'vitest';
import { ParticipantType } from '@/project-participants/types';
import type { AllocationLine } from './buildAllocationSchedule';
import {
  buildVersionComparison,
  countChangedLines,
} from './compareVersions';

function line(
  overrides: Partial<AllocationLine> &
    Pick<
      AllocationLine,
      'participantKey' | 'approvedProfitShare' | 'proposedProfitShare'
    >,
): AllocationLine {
  return {
    label: overrides.label ?? overrides.participantKey,
    participantType: ParticipantType.Director,
    approved: {
      id: 'a',
      version: 1,
    } as AllocationLine['approved'],
    pending: {
      id: 'p',
      version: 2,
      status: 'draft',
    } as AllocationLine['pending'],
    approvedLossShare: overrides.approvedProfitShare,
    proposedLossShare: overrides.proposedProfitShare,
    deltaProfitShare:
      overrides.proposedProfitShare - overrides.approvedProfitShare,
    isEditable: true,
    pendingStatus: 'draft',
    ...overrides,
  };
}

describe('buildVersionComparison', () => {
  it('flags changed lines and counts them', () => {
    const rows = buildVersionComparison([
      line({
        participantKey: 'a',
        approvedProfitShare: 40,
        proposedProfitShare: 45,
      }),
      line({
        participantKey: 'b',
        approvedProfitShare: 60,
        proposedProfitShare: 60,
      }),
    ]);
    expect(rows[0]?.changed).toBe(true);
    expect(rows[0]?.delta).toBe(5);
    expect(rows[1]?.changed).toBe(false);
    expect(countChangedLines(rows)).toBe(1);
  });
});
