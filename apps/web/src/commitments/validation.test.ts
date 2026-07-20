import { describe, expect, it } from 'vitest';
import {
  assertCommitmentNotBelowReceived,
  commitmentAmendSchema,
  commitmentCreateSchema,
} from './validation';
import { ContributionType } from './types';

describe('assertCommitmentNotBelowReceived', () => {
  it('allows amount ≥ receipts', () => {
    expect(assertCommitmentNotBelowReceived(1000, 500).ok).toBe(true);
    expect(assertCommitmentNotBelowReceived(500, 500).ok).toBe(true);
  });

  it('rejects amount below receipts', () => {
    const result = assertCommitmentNotBelowReceived(400, 500);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/cannot be less than already received/);
    }
  });
});

describe('commitmentCreateSchema', () => {
  it('requires dates and contribution type', () => {
    const parsed = commitmentCreateSchema.safeParse({
      participantId: '507f1f77bcf86cd799439011',
      commitmentAmount: 1000,
      commitmentDate: '',
      dueDate: '',
      contributionType: ContributionType.Capital,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid create payload', () => {
    const parsed = commitmentCreateSchema.safeParse({
      participantId: '507f1f77bcf86cd799439011',
      commitmentAmount: 1_000_000,
      commitmentDate: '2026-07-01',
      dueDate: '2026-12-31',
      contributionType: ContributionType.Equity,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('commitmentAmendSchema', () => {
  it('blocks amendment below received amount', () => {
    const parsed = commitmentAmendSchema.safeParse({
      commitmentAmount: 100,
      receivedAmount: 500,
      contributionType: ContributionType.Capital,
      remarks: 'Increase',
    });
    expect(parsed.success).toBe(false);
  });

  it('requires remarks for amendment', () => {
    const parsed = commitmentAmendSchema.safeParse({
      commitmentAmount: 1000,
      receivedAmount: 100,
      contributionType: ContributionType.Capital,
      remarks: '',
    });
    expect(parsed.success).toBe(false);
  });
});
