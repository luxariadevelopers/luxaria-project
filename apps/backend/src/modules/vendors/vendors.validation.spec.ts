import { BadRequestException } from '@nestjs/common';
import {
  assertCreditLimit,
  assertMaterialCategories,
  assertRating,
  assertRetentionPercentage,
  assertTdsRules,
  assertValidAccountNumber,
  assertValidIfsc,
} from './vendors.validation';

describe('vendors.validation', () => {
  it('validates IFSC and account number', () => {
    expect(() => assertValidIfsc('HDFC0001234')).not.toThrow();
    expect(() => assertValidIfsc('BAD')).toThrow(BadRequestException);
    expect(() => assertValidAccountNumber('123456789012')).not.toThrow();
    expect(() => assertValidAccountNumber('12')).toThrow(BadRequestException);
  });

  it('normalizes and validates material categories', () => {
    expect(assertMaterialCategories(['Cement', 'steel', 'cement'])).toEqual([
      'cement',
      'steel',
    ]);
    expect(() => assertMaterialCategories(['Bad Category!'])).toThrow(
      BadRequestException,
    );
  });

  it('enforces TDS rules', () => {
    expect(() =>
      assertTdsRules({ tdsApplicable: true, tdsPercentage: 1 }),
    ).not.toThrow();
    expect(() =>
      assertTdsRules({ tdsApplicable: true, tdsPercentage: null }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertTdsRules({ tdsApplicable: false, tdsPercentage: 2 }),
    ).toThrow(BadRequestException);
  });

  it('validates retention, rating and credit limit ranges', () => {
    expect(() => assertRetentionPercentage(5)).not.toThrow();
    expect(() => assertRetentionPercentage(120)).toThrow(BadRequestException);
    expect(() => assertRating(4.5)).not.toThrow();
    expect(() => assertRating(6)).toThrow(BadRequestException);
    expect(() => assertCreditLimit(0)).not.toThrow();
    expect(() => assertCreditLimit(-1)).toThrow(BadRequestException);
  });
});
