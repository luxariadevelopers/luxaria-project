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

  it('includes extras, equipment/labour recoveries and GST in period amounts', () => {
    const amounts = computeBillAmounts({
      currentCertifiedValue: 100000,
      approvedExtras: 5000,
      priceEscalation: 2000,
      advanceRecovery: 10000,
      materialRecovery: 1000,
      equipmentRecovery: 500,
      labourRecovery: 250,
      retention: 3000,
      tds: 2000,
      penalty: 100,
      otherDeductions: 150,
      gst: 12150,
    });

    expect(amounts.totalDeductions).toBe(17000);
    // (100000 + 5000 + 2000) - 17000 + 12150 = 102150
    expect(amounts.netPayable).toBe(102150);
  });
});
