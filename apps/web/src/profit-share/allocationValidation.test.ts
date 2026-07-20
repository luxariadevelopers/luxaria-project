import { describe, expect, it } from 'vitest';
import { ParticipantType } from '@/project-participants/types';
import {
  isValidPercentInput,
  validateProposedAllocation,
} from './allocationValidation';
import type { AllocationLine } from './buildAllocationSchedule';

function line(
  overrides: Partial<AllocationLine> &
    Pick<AllocationLine, 'participantKey' | 'proposedProfitShare'>,
): AllocationLine {
  return {
    label: overrides.label ?? overrides.participantKey,
    participantType: ParticipantType.Director,
    approved: null,
    pending: overrides.isEditable
      ? ({
          id: 'draft-1',
          status: 'draft',
          version: 2,
        } as AllocationLine['pending'])
      : null,
    approvedProfitShare: overrides.approvedProfitShare ?? 0,
    proposedLossShare: overrides.proposedLossShare ?? overrides.proposedProfitShare,
    approvedLossShare: 0,
    deltaProfitShare:
      overrides.deltaProfitShare ??
      overrides.proposedProfitShare - (overrides.approvedProfitShare ?? 0),
    isEditable: overrides.isEditable ?? false,
    pendingStatus: overrides.pendingStatus ?? (overrides.isEditable ? 'draft' : null),
    ...overrides,
  };
}

describe('validateProposedAllocation', () => {
  it('allows submit only when drafts exist and total is 100%', () => {
    const ok = validateProposedAllocation([
      line({
        participantKey: 'a',
        proposedProfitShare: 40,
        isEditable: true,
      }),
      line({
        participantKey: 'b',
        proposedProfitShare: 60,
        isEditable: true,
      }),
    ]);
    expect(ok.isBalanced).toBe(true);
    expect(ok.canSubmit).toBe(true);
  });

  it('blocks invalid totals', () => {
    const bad = validateProposedAllocation([
      line({
        participantKey: 'a',
        proposedProfitShare: 40,
        isEditable: true,
      }),
      line({
        participantKey: 'b',
        proposedProfitShare: 40,
        isEditable: true,
      }),
    ]);
    expect(bad.canSubmit).toBe(false);
    expect(bad.isBalanced).toBe(false);
  });

  it('blocks negative percentages', () => {
    const bad = validateProposedAllocation([
      line({
        participantKey: 'a',
        proposedProfitShare: -5,
        isEditable: true,
      }),
      line({
        participantKey: 'b',
        proposedProfitShare: 105,
        isEditable: true,
      }),
    ]);
    expect(bad.hasNegative).toBe(true);
    expect(bad.canSubmit).toBe(false);
  });

  it('requires drafts before submit', () => {
    const noDrafts = validateProposedAllocation([
      line({
        participantKey: 'a',
        proposedProfitShare: 100,
        isEditable: false,
      }),
    ]);
    expect(noDrafts.canSubmit).toBe(false);
  });
});

describe('isValidPercentInput', () => {
  it('rejects negatives and values over 100', () => {
    expect(isValidPercentInput(0)).toBe(true);
    expect(isValidPercentInput(100)).toBe(true);
    expect(isValidPercentInput(-0.01)).toBe(false);
    expect(isValidPercentInput(100.1)).toBe(false);
  });
});
