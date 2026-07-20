import { describe, expect, it } from 'vitest';
import {
  CommitmentStatus,
  ContributionType,
  type CommitmentSummary,
  type PublicCommitment,
} from '@/commitments/types';
import {
  aggregateParticipantFunding,
  buildFundingCards,
  fundingFiltersReady,
  periodFromForDate,
} from './deriveFunding';

function commitment(
  partial: Partial<PublicCommitment> &
    Pick<PublicCommitment, 'id' | 'participantId' | 'status'>,
): PublicCommitment {
  return {
    projectId: 'proj-a',
    commitmentNumber: 'COM-1',
    commitmentAmount: 1_000_000,
    commitmentDate: '2026-01-01T00:00:00.000Z',
    dueDate: null,
    contributionType: ContributionType.Capital,
    paymentSchedule: [],
    expectedBankAccount: {
      bankName: null,
      ifsc: null,
      accountHolderName: null,
      accountNumberLast4: null,
    },
    agreementReference: null,
    remarks: null,
    version: 1,
    supersedesId: null,
    receivedAmount: 0,
    pendingAmount: 1_000_000,
    receipts: [],
    submittedBy: null,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    ...partial,
  };
}

describe('periodFromForDate', () => {
  it('uses calendar-year start of as-of date', () => {
    expect(periodFromForDate('2026-07-20')).toBe('2026-01-01');
    expect(periodFromForDate('2025-12-31')).toBe('2025-01-01');
  });
});

describe('fundingFiltersReady', () => {
  it('requires both project and date', () => {
    expect(fundingFiltersReady({ date: '', projectId: 'p1' })).toBe(false);
    expect(fundingFiltersReady({ date: '2026-07-20', projectId: '' })).toBe(
      false,
    );
    expect(
      fundingFiltersReady({ date: '2026-07-20', projectId: 'p1' }),
    ).toBe(true);
  });
});

describe('buildFundingCards — totals', () => {
  it('maps summary committed / received / pending and funding gap', () => {
    const summary: CommitmentSummary = {
      projectId: 'proj-a',
      participantId: null,
      committedAmount: 10_000_000,
      receivedAmount: 4_000_000,
      pendingAmount: 6_000_000,
      approvedCommitmentCount: 2,
      note: '',
    };
    const cards = buildFundingCards(summary);
    expect(cards.find((c) => c.id === 'committed')?.amount).toBe(10_000_000);
    expect(cards.find((c) => c.id === 'received')?.amount).toBe(4_000_000);
    expect(cards.find((c) => c.id === 'pending')?.amount).toBe(6_000_000);
    expect(cards.find((c) => c.id === 'gap')?.amount).toBe(6_000_000);
  });

  it('zeros when summary is undefined (project switch / empty)', () => {
    const cards = buildFundingCards(undefined);
    expect(cards.every((c) => c.amount === 0)).toBe(true);
  });
});

describe('aggregateParticipantFunding — project switching aggregation', () => {
  it('sums approved rows by participant and ignores non-approved', () => {
    const rows = aggregateParticipantFunding(
      [
        commitment({
          id: '1',
          participantId: 'alice',
          status: CommitmentStatus.Approved,
          commitmentAmount: 5_000_000,
          receivedAmount: 2_000_000,
          pendingAmount: 3_000_000,
        }),
        commitment({
          id: '2',
          participantId: 'alice',
          status: CommitmentStatus.Approved,
          commitmentAmount: 1_000_000,
          receivedAmount: 1_000_000,
          pendingAmount: 0,
        }),
        commitment({
          id: '3',
          participantId: 'bob',
          status: CommitmentStatus.Approved,
          commitmentAmount: 8_000_000,
          receivedAmount: 0,
          pendingAmount: 8_000_000,
        }),
        commitment({
          id: '4',
          participantId: 'carol',
          status: CommitmentStatus.Draft,
          commitmentAmount: 99_000_000,
          receivedAmount: 0,
          pendingAmount: 99_000_000,
        }),
      ],
      (id) => (id === 'alice' ? 'Alice Cap' : id === 'bob' ? 'Bob Cap' : id),
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.participantId).toBe('bob');
    expect(rows[0]?.committedAmount).toBe(8_000_000);
    expect(rows[1]?.participantId).toBe('alice');
    expect(rows[1]?.committedAmount).toBe(6_000_000);
    expect(rows[1]?.receivedAmount).toBe(3_000_000);
    expect(rows[1]?.pendingAmount).toBe(3_000_000);
    expect(rows[1]?.label).toBe('Alice Cap');
  });

  it('returns empty when switching to a project with no approved commitments', () => {
    expect(
      aggregateParticipantFunding(
        [
          commitment({
            id: '1',
            participantId: 'x',
            status: CommitmentStatus.Cancelled,
            commitmentAmount: 1,
            pendingAmount: 0,
          }),
        ],
        (id) => id,
      ),
    ).toEqual([]);
  });
});
