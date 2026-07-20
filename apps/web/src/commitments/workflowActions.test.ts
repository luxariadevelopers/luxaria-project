import { describe, expect, it } from 'vitest';
import type { CommitmentCapabilities } from './roleAccess';
import {
  CommitmentStatus,
  ContributionType,
  type PublicCommitment,
} from './types';
import { resolveCommitmentRowActions } from './workflowActions';

const allCaps: CommitmentCapabilities = {
  canView: true,
  canCreate: true,
  canSubmit: true,
  canApprove: true,
  canAmend: true,
  canCancel: true,
  canRecordReceipt: true,
};

function row(
  overrides: Partial<PublicCommitment> &
    Pick<PublicCommitment, 'status' | 'receivedAmount' | 'pendingAmount'>,
): PublicCommitment {
  return {
    id: 'c1',
    projectId: 'p1',
    participantId: 'part1',
    commitmentNumber: 'COM-2026-000001',
    commitmentAmount: 100,
    commitmentDate: '2026-01-01',
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
    receipts: [],
    submittedBy: null,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  };
}

describe('resolveCommitmentRowActions', () => {
  it('allows submit only on draft', () => {
    expect(
      resolveCommitmentRowActions(
        row({
          status: CommitmentStatus.Draft,
          receivedAmount: 0,
          pendingAmount: 100,
        }),
        allCaps,
      ),
    ).toEqual(['submit', 'cancel']);
  });

  it('allows approve only on submitted', () => {
    expect(
      resolveCommitmentRowActions(
        row({
          status: CommitmentStatus.Submitted,
          receivedAmount: 0,
          pendingAmount: 100,
        }),
        allCaps,
      ),
    ).toEqual(['approve', 'cancel']);
  });

  it('allows amend and receipt on approved with pending', () => {
    expect(
      resolveCommitmentRowActions(
        row({
          status: CommitmentStatus.Approved,
          receivedAmount: 10,
          pendingAmount: 90,
        }),
        allCaps,
      ),
    ).toEqual(['amend', 'record_receipt']);
  });

  it('blocks cancel when approved and already received', () => {
    const actions = resolveCommitmentRowActions(
      row({
        status: CommitmentStatus.Approved,
        receivedAmount: 10,
        pendingAmount: 90,
      }),
      allCaps,
    );
    expect(actions).not.toContain('cancel');
  });

  it('blocks actions without permissions', () => {
    expect(
      resolveCommitmentRowActions(
        row({
          status: CommitmentStatus.Draft,
          receivedAmount: 0,
          pendingAmount: 100,
        }),
        { ...allCaps, canSubmit: false, canCancel: false },
      ),
    ).toEqual([]);
  });
});
