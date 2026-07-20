import { describe, expect, it } from 'vitest';
import { isCommitmentOverdue } from './overdue';
import { CommitmentStatus } from './types';

describe('isCommitmentOverdue', () => {
  const asOf = new Date('2026-07-20T12:00:00.000Z');

  it('flags approved pending past due date', () => {
    expect(
      isCommitmentOverdue(
        {
          status: CommitmentStatus.Approved,
          dueDate: '2026-07-01T00:00:00.000Z',
          pendingAmount: 100_000,
        },
        asOf,
      ),
    ).toBe(true);
  });

  it('ignores draft / zero pending / future due', () => {
    expect(
      isCommitmentOverdue(
        {
          status: CommitmentStatus.Draft,
          dueDate: '2026-07-01T00:00:00.000Z',
          pendingAmount: 100_000,
        },
        asOf,
      ),
    ).toBe(false);
    expect(
      isCommitmentOverdue(
        {
          status: CommitmentStatus.Approved,
          dueDate: '2026-07-01T00:00:00.000Z',
          pendingAmount: 0,
        },
        asOf,
      ),
    ).toBe(false);
    expect(
      isCommitmentOverdue(
        {
          status: CommitmentStatus.Approved,
          dueDate: '2026-08-01T00:00:00.000Z',
          pendingAmount: 50_000,
        },
        asOf,
      ),
    ).toBe(false);
  });
});
