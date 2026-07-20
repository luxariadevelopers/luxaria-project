import { describe, expect, it } from 'vitest';
import { buildCommitmentTimeline } from './buildCommitmentTimeline';
import {
  CommitmentStatus,
  ContributionType,
  type PublicCommitment,
} from './types';

function base(
  overrides: Partial<PublicCommitment> = {},
): PublicCommitment {
  return {
    id: 'c1',
    projectId: 'p1',
    participantId: 'part1',
    commitmentNumber: 'COM-2026-000001',
    commitmentAmount: 100,
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
    status: CommitmentStatus.Approved,
    version: 2,
    supersedesId: 'c0',
    receivedAmount: 25,
    pendingAmount: 75,
    receipts: [
      {
        amount: 25,
        receivedAt: '2026-02-01T00:00:00.000Z',
        reference: 'R1',
        remarks: null,
        recordedBy: 'u1',
      },
    ],
    submittedBy: 'u1',
    submittedAt: '2026-01-10T00:00:00.000Z',
    approvedBy: 'u2',
    approvedAt: '2026-01-12T00:00:00.000Z',
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildCommitmentTimeline', () => {
  it('includes submit, approve and receipt events in order', () => {
    const events = buildCommitmentTimeline(base(), [
      {
        ...base({
          id: 'c0',
          version: 1,
          status: CommitmentStatus.Superseded,
          receipts: [],
          submittedAt: null,
          approvedAt: '2026-01-05T00:00:00.000Z',
          updatedAt: '2026-01-12T00:00:00.000Z',
        }),
      },
    ]);
    const actions = events.map((e) => e.action);
    expect(actions).toContain('created');
    expect(actions).toContain('submitted');
    expect(actions).toContain('approved');
    expect(actions).toContain('superseded');
    expect(actions).toContain('receipt_recorded');
    const times = events
      .map((e) => e.at)
      .filter((t): t is string => Boolean(t))
      .map((t) => Date.parse(t));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
