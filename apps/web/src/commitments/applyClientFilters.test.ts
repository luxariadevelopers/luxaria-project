import { describe, expect, it } from 'vitest';
import { applyCommitmentClientFilters } from './applyClientFilters';
import {
  CommitmentStatus,
  ContributionType,
  type PublicCommitment,
} from './types';

function row(
  partial: Partial<PublicCommitment> &
    Pick<PublicCommitment, 'id' | 'status' | 'version'>,
): PublicCommitment {
  return {
    projectId: 'p1',
    participantId: 'part1',
    commitmentNumber: 'COM-2026-000001',
    commitmentAmount: 1_000_000,
    commitmentDate: '2026-01-01T00:00:00.000Z',
    dueDate: '2026-06-01T00:00:00.000Z',
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

describe('applyCommitmentClientFilters — amendment + overdue', () => {
  const asOf = new Date('2026-07-20T12:00:00.000Z');

  const rows = [
    row({
      id: 'v1',
      status: CommitmentStatus.Superseded,
      version: 1,
      pendingAmount: 0,
      receivedAmount: 500_000,
    }),
    row({
      id: 'v2',
      status: CommitmentStatus.Approved,
      version: 2,
      dueDate: '2026-06-01T00:00:00.000Z',
      pendingAmount: 200_000,
      receivedAmount: 800_000,
    }),
    row({
      id: 'draft',
      status: CommitmentStatus.Draft,
      version: 1,
      commitmentNumber: 'COM-2026-000002',
      dueDate: '2026-08-01T00:00:00.000Z',
    }),
  ];

  it('filters amendments (version > 1)', () => {
    const result = applyCommitmentClientFilters(
      rows,
      { overdueOnly: false, amendment: 'amendments' },
      asOf,
    );
    expect(result.map((r) => r.id)).toEqual(['v2']);
  });

  it('filters superseded versions', () => {
    const result = applyCommitmentClientFilters(
      rows,
      { overdueOnly: false, amendment: 'superseded' },
      asOf,
    );
    expect(result.map((r) => r.id)).toEqual(['v1']);
  });

  it('filters overdue approved rows', () => {
    const result = applyCommitmentClientFilters(
      rows,
      { overdueOnly: true, amendment: 'all' },
      asOf,
    );
    expect(result.map((r) => r.id)).toEqual(['v2']);
  });

  it('combines current + overdue', () => {
    const result = applyCommitmentClientFilters(
      rows,
      { overdueOnly: true, amendment: 'current' },
      asOf,
    );
    expect(result.map((r) => r.id)).toEqual(['v2']);
  });
});
