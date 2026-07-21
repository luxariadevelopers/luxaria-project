import {
  assertQuantities,
  signedBaseDelta,
} from './stock-ledger.validation';
import { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';

describe('stock ledger enterprise validation', () => {
  it('allows manual receipt as inbound', () => {
    expect(() =>
      assertQuantities({
        transactionType: StockTransactionType.ManualReceipt,
        quantityIn: 10,
        quantityOut: 0,
      }),
    ).not.toThrow();
  });

  it('allows scrap as outbound', () => {
    expect(() =>
      assertQuantities({
        transactionType: StockTransactionType.Scrap,
        quantityIn: 0,
        quantityOut: 2,
      }),
    ).not.toThrow();
  });

  it('computes signed delta for before/after qty math', () => {
    expect(
      signedBaseDelta({ quantityInBase: 5, quantityOutBase: 2 }),
    ).toBe(3);
  });
});
