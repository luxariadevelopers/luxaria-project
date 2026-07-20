import { describe, expect, it } from 'vitest';
import { isPurchaseRequestOverdue } from './overdue';
import { PurchaseRequestStatus } from './types';

describe('isPurchaseRequestOverdue', () => {
  const asOf = new Date('2026-07-20T12:00:00.000Z');

  it('flags open work past required-by date', () => {
    expect(
      isPurchaseRequestOverdue(
        {
          status: PurchaseRequestStatus.Submitted,
          requiredByDate: '2026-07-19',
        },
        asOf,
      ),
    ).toBe(true);
  });

  it('ignores draft and closed rows', () => {
    expect(
      isPurchaseRequestOverdue(
        {
          status: PurchaseRequestStatus.Draft,
          requiredByDate: '2026-07-01',
        },
        asOf,
      ),
    ).toBe(false);
    expect(
      isPurchaseRequestOverdue(
        {
          status: PurchaseRequestStatus.Closed,
          requiredByDate: '2026-07-01',
        },
        asOf,
      ),
    ).toBe(false);
  });

  it('is false when required-by is today or future', () => {
    expect(
      isPurchaseRequestOverdue(
        {
          status: PurchaseRequestStatus.Approved,
          requiredByDate: '2026-07-20',
        },
        asOf,
      ),
    ).toBe(false);
  });
});
