import { describe, expect, it } from 'vitest';
import {
  customerReceiptCreateSchema,
  isDuplicateTransactionReferenceMessage,
  paymentModeRequiresBankFields,
} from './validation';
import {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
} from './types';

describe('isDuplicateTransactionReferenceMessage', () => {
  it('detects Nest conflict copy for duplicate bank txn refs', () => {
    expect(
      isDuplicateTransactionReferenceMessage(
        'transactionReference already used for this company bank account',
      ),
    ).toBe(true);
    expect(
      isDuplicateTransactionReferenceMessage(
        'Duplicate transaction reference for this bank account',
      ),
    ).toBe(true);
    expect(
      isDuplicateTransactionReferenceMessage('amount must be greater than zero'),
    ).toBe(false);
  });
});

describe('customerReceiptCreateSchema', () => {
  const base = {
    customerId: '507f1f77bcf86cd799439011',
    bookingId: '507f1f77bcf86cd799439012',
    receiptDate: '2026-07-20',
    amount: 500_000,
    paymentMode: CustomerReceiptPaymentMode.BankTransfer,
    companyBankAccountId: '507f1f77bcf86cd799439013',
    transactionReference: 'UTR123456',
    sourceType: CustomerReceiptSourceType.OwnFund,
    scheduleAllocation: [] as Array<{ demandId: string; amount: number }>,
    postImmediately: false,
  };

  it('allows unallocated advance (empty allocations)', () => {
    const parsed = customerReceiptCreateSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it('rejects allocation sum above receipt amount', () => {
    const parsed = customerReceiptCreateSchema.safeParse({
      ...base,
      scheduleAllocation: [
        { demandId: '507f1f77bcf86cd799439014', amount: 400_000 },
        { demandId: '507f1f77bcf86cd799439015', amount: 200_000 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('requires bank fields for NEFT', () => {
    expect(paymentModeRequiresBankFields(CustomerReceiptPaymentMode.Neft)).toBe(
      true,
    );
    const parsed = customerReceiptCreateSchema.safeParse({
      ...base,
      paymentMode: CustomerReceiptPaymentMode.Neft,
      companyBankAccountId: '',
      transactionReference: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('allows cash without bank fields', () => {
    const parsed = customerReceiptCreateSchema.safeParse({
      ...base,
      paymentMode: CustomerReceiptPaymentMode.Cash,
      companyBankAccountId: '',
      transactionReference: '',
    });
    expect(parsed.success).toBe(true);
  });
});
