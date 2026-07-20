import { BadRequestException } from '@nestjs/common';
import {
  assertOrderDates,
  assertReceivableQuantity,
  computeLineTotal,
  computePoTotal,
  maxReceivableQuantity,
} from './purchase-orders.validation';

describe('purchase-orders.validation', () => {
  it('computes line and PO totals', () => {
    expect(
      computeLineTotal({ quantity: 10, rate: 100, tax: 50, discount: 20 }),
    ).toBe(1030);
    expect(
      computePoTotal({
        subtotal: 1000,
        taxes: 100,
        freight: 50,
        discount: 25,
      }),
    ).toBe(1125);
  });

  it('rejects delivery earlier than order date', () => {
    expect(() =>
      assertOrderDates(new Date('2026-08-01'), new Date('2026-07-01')),
    ).toThrow(/expectedDeliveryDate/);
  });

  it('allows receive within configured tolerance', () => {
    expect(maxReceivableQuantity(100, 5)).toBe(105);
    expect(() =>
      assertReceivableQuantity({
        orderedQuantity: 100,
        alreadyReceived: 100,
        receiveNow: 5,
        tolerancePercent: 5,
      }),
    ).not.toThrow();
  });

  it('rejects receive beyond tolerance', () => {
    expect(() =>
      assertReceivableQuantity({
        orderedQuantity: 100,
        alreadyReceived: 100,
        receiveNow: 6,
        tolerancePercent: 5,
        materialLabel: 'MAT-1',
      }),
    ).toThrow(BadRequestException);
  });
});
