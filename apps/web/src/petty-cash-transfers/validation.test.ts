import { describe, expect, it } from 'vitest';
import {
  PettyCashFundTransferStatus,
  type PublicPettyCashFundTransfer,
} from './types';
import {
  assertAmountWithinApprovedRemainder,
  DUPLICATE_TXN_REF_MESSAGE,
  findDuplicateTransactionReference,
  isDuplicateTransactionReferenceMessage,
  transferCreateSchema,
} from './validation';

function transfer(
  partial: Partial<PublicPettyCashFundTransfer> &
    Pick<PublicPettyCashFundTransfer, 'id' | 'status'>,
): PublicPettyCashFundTransfer {
  return {
    transferNumber: 'PCF-2026-000001',
    projectId: 'p1',
    requestId: 'req1',
    sourceBankAccountId: 'bank1',
    destinationPettyCashAccountId: 'cash1',
    transferDate: '2026-07-01T00:00:00.000Z',
    amount: 10_000,
    transactionReference: 'NEFT-1',
    paymentProof: null,
    journalEntryId: null,
    verifiedBy: null,
    verifiedAt: null,
    postedBy: null,
    postedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    ...partial,
  };
}

describe('assertAmountWithinApprovedRemainder', () => {
  it('allows amount within remaining approved balance', () => {
    expect(assertAmountWithinApprovedRemainder(100, 500).ok).toBe(true);
  });

  it('rejects amount above remaining approved balance', () => {
    const result = assertAmountWithinApprovedRemainder(600, 500);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/exceeds approved request balance/);
    }
  });
});

describe('duplicate transaction reference', () => {
  it('detects Nest conflict / idempotency messages', () => {
    expect(
      isDuplicateTransactionReferenceMessage(DUPLICATE_TXN_REF_MESSAGE),
    ).toBe(true);
    expect(
      isDuplicateTransactionReferenceMessage(
        'A fund transfer with this idempotency key already exists',
      ),
    ).toBe(true);
    expect(isDuplicateTransactionReferenceMessage('Other conflict')).toBe(
      false,
    );
  });

  it('finds duplicate bank + txn ref among active transfers', () => {
    const rows = [
      transfer({
        id: '1',
        status: PettyCashFundTransferStatus.Draft,
        transactionReference: 'NEFT-99',
        sourceBankAccountId: 'bank1',
      }),
      transfer({
        id: '2',
        status: PettyCashFundTransferStatus.Cancelled,
        transactionReference: 'NEFT-99',
        sourceBankAccountId: 'bank1',
      }),
    ];
    expect(
      findDuplicateTransactionReference(rows, 'bank1', 'neft-99')?.id,
    ).toBe('1');
    expect(
      findDuplicateTransactionReference(rows, 'bank2', 'NEFT-99'),
    ).toBeNull();
  });
});

describe('transferCreateSchema', () => {
  it('requires transaction reference', () => {
    const parsed = transferCreateSchema.safeParse({
      requestId: '507f1f77bcf86cd799439011',
      sourceBankAccountId: '507f1f77bcf86cd799439012',
      destinationPettyCashAccountId: '507f1f77bcf86cd799439013',
      transferDate: '2026-07-01',
      amount: 1000,
      transactionReference: '',
      remainingApprovedBalance: 5000,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects amount above remaining approved balance', () => {
    const parsed = transferCreateSchema.safeParse({
      requestId: '507f1f77bcf86cd799439011',
      sourceBankAccountId: '507f1f77bcf86cd799439012',
      destinationPettyCashAccountId: '507f1f77bcf86cd799439013',
      transferDate: '2026-07-01',
      amount: 9000,
      transactionReference: 'NEFT-1',
      remainingApprovedBalance: 5000,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid funding draft', () => {
    const parsed = transferCreateSchema.safeParse({
      requestId: '507f1f77bcf86cd799439011',
      sourceBankAccountId: '507f1f77bcf86cd799439012',
      destinationPettyCashAccountId: '507f1f77bcf86cd799439013',
      transferDate: '2026-07-01',
      amount: 1000,
      transactionReference: 'NEFT-1',
      remainingApprovedBalance: 5000,
    });
    expect(parsed.success).toBe(true);
  });
});
