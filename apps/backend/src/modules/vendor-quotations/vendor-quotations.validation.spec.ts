import { BadRequestException } from '@nestjs/common';
import { MaterialUnit } from '../material-master/schemas/material.schema';
import {
  assertMaterialUnitAllowed,
  assertQuotationDates,
  computeGrandTotal,
  computeLineTotal,
} from './vendor-quotations.validation';

describe('vendor-quotations.validation', () => {
  it('computes line total = qty × rate − discount + tax', () => {
    expect(
      computeLineTotal({ quantity: 10, rate: 100, tax: 50, discount: 20 }),
    ).toBe(1030);
  });

  it('rejects line discount above qty × rate', () => {
    expect(() =>
      computeLineTotal({ quantity: 2, rate: 10, tax: 0, discount: 30 }),
    ).toThrow(BadRequestException);
  });

  it('computes grand total with freight/taxes/discount', () => {
    expect(
      computeGrandTotal({
        itemsSubtotal: 1000,
        freight: 100,
        taxes: 50,
        discount: 75,
      }),
    ).toBe(1075);
  });

  it('rejects validity earlier than quotation date', () => {
    expect(() =>
      assertQuotationDates(new Date('2026-08-01'), new Date('2026-07-01')),
    ).toThrow(/validityDate/);
  });

  it('allows material unit from base or alternate', () => {
    expect(() =>
      assertMaterialUnitAllowed(MaterialUnit.Bag, {
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
      }),
    ).not.toThrow();
    expect(() =>
      assertMaterialUnitAllowed(MaterialUnit.Kilogram, {
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [MaterialUnit.Ton],
      }),
    ).toThrow(BadRequestException);
  });
});
