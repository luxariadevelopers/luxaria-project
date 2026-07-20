import { BadRequestException } from '@nestjs/common';
import {
  assertDateRange,
  computeBoqLineValue,
  daysUntil,
  resolveExpiryAlertType,
  summarizeBoqItems,
} from './contractor-agreements.validation';
import { ContractorAgreementExpiryAlertType } from './schemas/contractor-agreement.schema';

describe('contractor-agreements.validation', () => {
  it('computes line value and rollups', () => {
    expect(computeBoqLineValue(10, 450)).toBe(4500);
    expect(() => computeBoqLineValue(-1, 10)).toThrow(BadRequestException);

    const summary = summarizeBoqItems([
      { agreedQuantity: 10, agreedRate: 100, agreedValue: 1000 },
      { agreedQuantity: 5, agreedRate: 200, agreedValue: 1000 },
    ]);
    expect(summary.agreedQuantity).toBe(15);
    expect(summary.agreedRatesTotal).toBe(2000);
  });

  it('validates date range', () => {
    expect(() =>
      assertDateRange(new Date('2026-01-01'), new Date('2026-12-31')),
    ).not.toThrow();
    expect(() =>
      assertDateRange(new Date('2026-12-31'), new Date('2026-01-01')),
    ).toThrow(BadRequestException);
  });

  it('resolves expiry alert types by remaining days', () => {
    expect(
      resolveExpiryAlertType({ daysRemaining: 45, warningDays: 30 }),
    ).toBeNull();
    expect(
      resolveExpiryAlertType({ daysRemaining: 20, warningDays: 30 }),
    ).toBe(ContractorAgreementExpiryAlertType.ExpiringSoon);
    expect(
      resolveExpiryAlertType({ daysRemaining: 5, warningDays: 30 }),
    ).toBe(ContractorAgreementExpiryAlertType.ExpiringCritical);
    expect(
      resolveExpiryAlertType({ daysRemaining: -2, warningDays: 30 }),
    ).toBe(ContractorAgreementExpiryAlertType.Expired);
  });

  it('computes days until end date in UTC days', () => {
    expect(
      daysUntil(new Date('2026-07-25T00:00:00.000Z'), new Date('2026-07-20T12:00:00.000Z')),
    ).toBe(5);
  });
});
