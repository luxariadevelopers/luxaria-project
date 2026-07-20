import { describe, expect, it } from 'vitest';
import {
  assertDateRange,
  computeBoqLineValue,
  daysUntil,
  resolveExpiryAlertType,
  summarizeBoqItems,
} from './calculations';

describe('contractor agreement calculations', () => {
  it('computes line value and rollups', () => {
    expect(computeBoqLineValue(10, 450)).toEqual({ ok: true, value: 4500 });
    expect(computeBoqLineValue(-1, 10).ok).toBe(false);

    const summary = summarizeBoqItems([
      { agreedQuantity: 10, agreedRate: 100 },
      { agreedQuantity: 5, agreedRate: 200 },
    ]);
    expect(summary.agreedQuantity).toBe(15);
    expect(summary.agreedRatesTotal).toBe(2000);
  });

  it('validates date range', () => {
    expect(assertDateRange('2026-01-01', '2026-12-31').ok).toBe(true);
    expect(assertDateRange('2026-12-31', '2026-01-01').ok).toBe(false);
  });

  it('resolves expiry alert types by remaining days', () => {
    expect(
      resolveExpiryAlertType({ daysRemaining: 45, warningDays: 30 }),
    ).toBeNull();
    expect(
      resolveExpiryAlertType({ daysRemaining: 20, warningDays: 30 }),
    ).toBe('expiring_soon');
    expect(
      resolveExpiryAlertType({ daysRemaining: 5, warningDays: 30 }),
    ).toBe('expiring_critical');
    expect(
      resolveExpiryAlertType({ daysRemaining: -2, warningDays: 30 }),
    ).toBe('expired');
  });

  it('computes days until end date in UTC days', () => {
    expect(
      daysUntil('2026-07-25', new Date('2026-07-20T12:00:00.000Z')),
    ).toBe(5);
  });
});
