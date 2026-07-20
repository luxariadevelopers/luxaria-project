import { describe, expect, it } from 'vitest';
import {
  assertAmountWithinCommitmentHeadroom,
  contributionReceiptCreateSchema,
  DUPLICATE_TXN_REF_MESSAGE,
  isDuplicateTransactionReferenceMessage,
} from './validation';
import { ContributionPaymentMode } from './types';

describe('assertAmountWithinCommitmentHeadroom', () => {
  it('allows amount within open commitment', () => {
    expect(assertAmountWithinCommitmentHeadroom(100, 500).ok).toBe(true);
  });

  it('rejects amount above open commitment', () => {
    const result = assertAmountWithinCommitmentHeadroom(600, 500);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/exceeds remaining commitment/);
    }
  });
});

describe('duplicate transaction reference conflict', () => {
  it('detects Nest 409 duplicate message', () => {
    expect(
      isDuplicateTransactionReferenceMessage(DUPLICATE_TXN_REF_MESSAGE),
    ).toBe(true);
    expect(
      isDuplicateTransactionReferenceMessage(
        'Duplicate transaction reference for this bank account',
      ),
    ).toBe(true);
    expect(isDuplicateTransactionReferenceMessage('Other conflict')).toBe(
      false,
    );
  });
});

describe('contributionReceiptCreateSchema', () => {
  it('requires bank fields for bank_transfer', () => {
    const parsed = contributionReceiptCreateSchema.safeParse({
      participantId: '507f1f77bcf86cd799439011',
      commitmentId: '507f1f77bcf86cd799439012',
      receivedDate: '2026-07-01',
      amount: 1000,
      paymentMode: ContributionPaymentMode.BankTransfer,
      bankAccountId: '',
      transactionReference: '',
      pendingHeadroom: 5000,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects amount above headroom', () => {
    const parsed = contributionReceiptCreateSchema.safeParse({
      participantId: '507f1f77bcf86cd799439011',
      commitmentId: '507f1f77bcf86cd799439012',
      receivedDate: '2026-07-01',
      amount: 9000,
      paymentMode: ContributionPaymentMode.Cash,
      pendingHeadroom: 5000,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts cash without bank fields', () => {
    const parsed = contributionReceiptCreateSchema.safeParse({
      participantId: '507f1f77bcf86cd799439011',
      commitmentId: '507f1f77bcf86cd799439012',
      receivedDate: '2026-07-01',
      amount: 1000,
      paymentMode: ContributionPaymentMode.Cash,
      pendingHeadroom: 5000,
    });
    expect(parsed.success).toBe(true);
  });
});
