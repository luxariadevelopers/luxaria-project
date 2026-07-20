import { BadRequestException } from '@nestjs/common';
import { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';
import {
  assertNonNegativeBalance,
  assertQuantities,
  signedBaseDelta,
} from './stock-ledger.validation';

describe('stock-ledger.validation', () => {
  describe('assertQuantities', () => {
    it('requires inflow for purchase receipt', () => {
      expect(() =>
        assertQuantities({
          transactionType: StockTransactionType.PurchaseReceipt,
          quantityIn: 10,
          quantityOut: 0,
        }),
      ).not.toThrow();

      expect(() =>
        assertQuantities({
          transactionType: StockTransactionType.PurchaseReceipt,
          quantityIn: 0,
          quantityOut: 10,
        }),
      ).toThrow(BadRequestException);
    });

    it('requires outflow for material issue', () => {
      expect(() =>
        assertQuantities({
          transactionType: StockTransactionType.MaterialIssue,
          quantityIn: 0,
          quantityOut: 5,
        }),
      ).not.toThrow();
    });

    it('requires exactly one side for adjustment', () => {
      expect(() =>
        assertQuantities({
          transactionType: StockTransactionType.Adjustment,
          quantityIn: 2,
          quantityOut: 0,
        }),
      ).not.toThrow();

      expect(() =>
        assertQuantities({
          transactionType: StockTransactionType.Adjustment,
          quantityIn: 1,
          quantityOut: 1,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('signedBaseDelta', () => {
    it('computes in − out', () => {
      expect(signedBaseDelta({ quantityInBase: 10, quantityOutBase: 3 })).toBe(7);
      expect(signedBaseDelta({ quantityInBase: 0, quantityOutBase: 4 })).toBe(-4);
    });
  });

  describe('assertNonNegativeBalance', () => {
    it('blocks negative when not allowed', () => {
      expect(() =>
        assertNonNegativeBalance({
          current: 5,
          delta: -6,
          allowNegative: false,
        }),
      ).toThrow(BadRequestException);
    });

    it('allows negative when explicitly permitted', () => {
      expect(
        assertNonNegativeBalance({
          current: 5,
          delta: -6,
          allowNegative: true,
        }),
      ).toBe(-1);
    });
  });
});
