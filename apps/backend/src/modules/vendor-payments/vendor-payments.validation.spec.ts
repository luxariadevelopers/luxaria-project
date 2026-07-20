import { BadRequestException } from '@nestjs/common';
import {
  assertAllocationsBalance,
  computeBankAmount,
  computeRemainingPayable,
  normalizeTransactionReference,
} from './vendor-payments.validation';

describe('vendor-payments.validation', () => {
  describe('normalizeTransactionReference', () => {
    it('requires a transaction ID', () => {
      expect(() => normalizeTransactionReference('')).toThrow(
        BadRequestException,
      );
      expect(() => normalizeTransactionReference('  ')).toThrow(
        BadRequestException,
      );
      expect(() => normalizeTransactionReference('ab')).toThrow(
        BadRequestException,
      );
    });

    it('trims a valid reference', () => {
      expect(normalizeTransactionReference('  UTR123456  ')).toBe('UTR123456');
    });
  });

  describe('assertAllocationsBalance', () => {
    it('requires allocations to sum to payment amount', () => {
      expect(() =>
        assertAllocationsBalance({
          amount: 1000,
          allocations: [{ amount: 600 }, { amount: 300 }],
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        assertAllocationsBalance({
          amount: 1000,
          allocations: [{ amount: 600 }, { amount: 400 }],
        }),
      ).not.toThrow();
    });

    it('rejects empty allocations', () => {
      expect(() =>
        assertAllocationsBalance({ amount: 100, allocations: [] }),
      ).toThrow(BadRequestException);
    });
  });

  describe('computeBankAmount', () => {
    it('computes net bank outflow', () => {
      expect(
        computeBankAmount({
          amount: 1000,
          tds: 100,
          retention: 50,
          deductions: 25,
        }),
      ).toBe(825);
    });

    it('rejects withholdings above amount', () => {
      expect(() =>
        computeBankAmount({
          amount: 100,
          tds: 80,
          retention: 30,
          deductions: 0,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('computeRemainingPayable', () => {
    it('supports partial payments', () => {
      expect(
        computeRemainingPayable({
          totalAmount: 1180,
          tds: 100,
          retention: 80,
          paidAmount: 500,
        }),
      ).toBe(500);
    });
  });
});
