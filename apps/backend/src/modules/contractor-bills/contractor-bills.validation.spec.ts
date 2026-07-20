import { BadRequestException } from '@nestjs/common';
import {
  assertBillingPeriod,
  computeAdvanceRecovery,
  computeBillAmounts,
  computeRetentionAmount,
  normalizePeriodDate,
} from './contractor-bills.validation';

describe('contractor-bills.validation', () => {
  it('normalizes billing period and rejects inverted range', () => {
    const from = normalizePeriodDate('2026-07-01', 'from');
    const to = normalizePeriodDate('2026-07-31', 'to');
    expect(() => assertBillingPeriod(from, to)).not.toThrow();
    expect(() => assertBillingPeriod(to, from)).toThrow(BadRequestException);
  });

  it('computes retention and advance recovery with remaining cap', () => {
    expect(computeRetentionAmount(100000, 5)).toBe(5000);

    expect(
      computeAdvanceRecovery({
        currentCertifiedValue: 100000,
        advanceAmount: 50000,
        alreadyRecovered: 10000,
        percentPerBill: 20,
      }),
    ).toBe(20000);

    expect(
      computeAdvanceRecovery({
        currentCertifiedValue: 100000,
        advanceAmount: 50000,
        alreadyRecovered: 45000,
        percentPerBill: 20,
      }),
    ).toBe(5000);

    expect(() =>
      computeAdvanceRecovery({
        currentCertifiedValue: 100000,
        advanceAmount: 50000,
        alreadyRecovered: 40000,
        overrideAmount: 15000,
      }),
    ).toThrow(BadRequestException);
  });

  it('computes net payable and rejects over-deduction', () => {
    const amounts = computeBillAmounts({
      currentCertifiedValue: 100000,
      advanceRecovery: 20000,
      materialRecovery: 5000,
      retention: 5000,
      tds: 2000,
      penalty: 1000,
      otherDeductions: 500,
    });

    expect(amounts.totalDeductions).toBe(33500);
    expect(amounts.netPayable).toBe(66500);

    expect(() =>
      computeBillAmounts({
        currentCertifiedValue: 1000,
        retention: 2000,
      }),
    ).toThrow(BadRequestException);
  });
});
