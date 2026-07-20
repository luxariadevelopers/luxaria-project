import { BadRequestException } from '@nestjs/common';
import {
  assertAllocationsBalance,
  computeBankAmount,
  computeRemainingBillPayable,
  normalizeTransactionReference,
} from './contractor-payments.validation';

describe('contractor-payments.validation', () => {
  it('requires a usable transaction reference', () => {
    expect(normalizeTransactionReference(' UTR123456 ')).toBe('UTR123456');
    expect(() => normalizeTransactionReference('')).toThrow(BadRequestException);
    expect(() => normalizeTransactionReference('ab')).toThrow(BadRequestException);
  });

  it('computes bank amount after TDS, retention, advance recovery, penalty', () => {
    expect(
      computeBankAmount({
        amount: 10000,
        tds: 200,
        retention: 500,
        advanceRecovery: 1000,
        penalty: 300,
      }),
    ).toBe(8000);

    expect(() =>
      computeBankAmount({
        amount: 1000,
        tds: 600,
        retention: 500,
        advanceRecovery: 0,
        penalty: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('requires allocations to balance the payment amount', () => {
    expect(() =>
      assertAllocationsBalance({
        amount: 1000,
        allocations: [{ amount: 600 }, { amount: 400 }],
      }),
    ).not.toThrow();

    expect(() =>
      assertAllocationsBalance({
        amount: 1000,
        allocations: [{ amount: 600 }],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertAllocationsBalance({ amount: 1000, allocations: [] }),
    ).toThrow(BadRequestException);
  });

  it('computes remaining bill payable for partial payments', () => {
    expect(
      computeRemainingBillPayable({ netPayable: 7000, paidAmount: 2000 }),
    ).toBe(5000);
    expect(
      computeRemainingBillPayable({ netPayable: 7000, paidAmount: 7000 }),
    ).toBe(0);
  });
});
