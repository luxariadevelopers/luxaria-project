import { BadRequestException } from '@nestjs/common';
import {
  assertAllocationTotals,
  assertPaymentModeBankFields,
  assertSourceTypeRules,
  normalizeTransactionReference,
} from './customer-receipts.validation';
import {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
} from './schemas/customer-receipt.schema';

describe('customer-receipts.validation', () => {
  it('requires loanBank for bank_loan source', () => {
    expect(() =>
      assertSourceTypeRules({
        sourceType: CustomerReceiptSourceType.BankLoan,
        loanBank: null,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertSourceTypeRules({
        sourceType: CustomerReceiptSourceType.OwnFund,
        loanBank: null,
      }),
    ).not.toThrow();
  });

  it('requires bank account + txn ref for bank payment modes', () => {
    expect(() =>
      assertPaymentModeBankFields({
        paymentMode: CustomerReceiptPaymentMode.Neft,
        companyBankAccountId: null,
        transactionReference: 'UTR123',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertPaymentModeBankFields({
        paymentMode: CustomerReceiptPaymentMode.Cash,
        companyBankAccountId: null,
        transactionReference: null,
      }),
    ).not.toThrow();
  });

  it('supports unallocated advance when allocations < amount', () => {
    const totals = assertAllocationTotals({
      amount: 500_000,
      allocations: [{ amount: 200_000 }, { amount: 100_000 }],
    });
    expect(totals.allocatedAmount).toBe(300_000);
    expect(totals.unallocatedAmount).toBe(200_000);
  });

  it('rejects over-allocation', () => {
    expect(() =>
      assertAllocationTotals({
        amount: 100_000,
        allocations: [{ amount: 120_000 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('normalizes transaction references', () => {
    expect(normalizeTransactionReference('  UTR-1  ')).toBe('UTR-1');
    expect(() => normalizeTransactionReference('ab')).toThrow(
      BadRequestException,
    );
  });
});
