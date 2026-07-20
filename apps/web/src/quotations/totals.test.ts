import { describe, expect, it } from 'vitest';
import {
  computeGrandTotal,
  computeLineTotal,
  previewQuotationTotals,
  sumItemsSubtotal,
} from './totals';

describe('quotation tax/discount totals', () => {
  it('computes line total = qty × rate − discount + tax', () => {
    expect(
      computeLineTotal({ quantity: 10, rate: 100, tax: 50, discount: 20 }),
    ).toBe(1030);
  });

  it('defaults missing line tax/discount to zero', () => {
    expect(computeLineTotal({ quantity: 2, rate: 50 })).toBe(100);
  });

  it('rounds line totals to 2 decimal places', () => {
    expect(
      computeLineTotal({ quantity: 3, rate: 10.333, tax: 0.1, discount: 0 }),
    ).toBe(31.1);
  });

  it('computes grand total with freight, header taxes, and discount', () => {
    expect(
      computeGrandTotal({
        itemsSubtotal: 1000,
        freight: 100,
        taxes: 50,
        discount: 75,
      }),
    ).toBe(1075);
  });

  it('clamps grand total at zero when header discount is large', () => {
    expect(
      computeGrandTotal({
        itemsSubtotal: 100,
        freight: 0,
        taxes: 0,
        discount: 200,
      }),
    ).toBe(0);
  });

  it('sums item subtotals with rounding', () => {
    expect(sumItemsSubtotal([{ total: 10.125 }, { total: 20.125 }])).toBe(
      30.25,
    );
  });

  it('previews multi-vendor line + header totals consistently', () => {
    const preview = previewQuotationTotals({
      items: [
        { quantity: 100, rate: 380, tax: 684, discount: 0 },
        { quantity: 50, rate: 200, tax: 100, discount: 50 },
      ],
      freight: 1500,
      taxes: 0,
      discount: 500,
    });
    expect(preview.lines[0]?.total).toBe(38684);
    expect(preview.lines[1]?.total).toBe(10050);
    expect(preview.itemsSubtotal).toBe(48734);
    expect(preview.grandTotal).toBe(49734);
  });
});
