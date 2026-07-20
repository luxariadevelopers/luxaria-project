import { describe, expect, it } from 'vitest';
import { computeLineTotal, computePoTotal, previewPoTotals } from './totals';

describe('computeLineTotal', () => {
  it('matches Nest quantity × rate − discount + tax', () => {
    expect(
      computeLineTotal({ quantity: 10, rate: 100, tax: 50, discount: 20 }),
    ).toBe(1030);
  });

  it('defaults tax/discount to zero', () => {
    expect(computeLineTotal({ quantity: 2, rate: 50.555 })).toBe(101.11);
  });

  it('returns 0 for non-positive quantity', () => {
    expect(computeLineTotal({ quantity: 0, rate: 100 })).toBe(0);
  });
});

describe('computePoTotal', () => {
  it('matches Nest subtotal + taxes + freight − discount', () => {
    expect(
      computePoTotal({
        subtotal: 1000,
        taxes: 100,
        freight: 50,
        discount: 25,
      }),
    ).toBe(1125);
  });

  it('floors negative totals at zero', () => {
    expect(
      computePoTotal({
        subtotal: 10,
        taxes: 0,
        freight: 0,
        discount: 100,
      }),
    ).toBe(0);
  });
});

describe('previewPoTotals', () => {
  it('sums line totals into subtotal and grand total', () => {
    const preview = previewPoTotals({
      items: [
        { quantity: 10, rate: 100, tax: 50, discount: 20 },
        { quantity: 2, rate: 50 },
      ],
      taxes: 10,
      freight: 5,
      discount: 15,
    });
    expect(preview.lineTotals).toEqual([1030, 100]);
    expect(preview.subtotal).toBe(1130);
    expect(preview.total).toBe(1130);
  });
});
