import { BadRequestException } from '@nestjs/common';
import {
  assertOpeningBalance,
  assertValidAccountNumber,
  assertValidIfsc,
  buildMaskedAccountNumber,
  normalizeAccountNumber,
} from './company-bank-accounts.validation';

describe('company-bank-accounts validation', () => {
  it('validates IFSC and account numbers', () => {
    expect(() => assertValidIfsc('HDFC0001234')).not.toThrow();
    expect(() => assertValidIfsc('BAD')).toThrow(BadRequestException);
    expect(() => assertValidAccountNumber('123456789012')).not.toThrow();
    expect(() => assertValidAccountNumber('12')).toThrow(BadRequestException);
  });

  it('masks account numbers and normalizes whitespace', () => {
    expect(normalizeAccountNumber('1234 5678 9012')).toBe('123456789012');
    expect(buildMaskedAccountNumber('123456789012')).toBe('XXXXXX9012');
  });

  it('rejects non-finite opening balances', () => {
    expect(() => assertOpeningBalance(Number.NaN)).toThrow(BadRequestException);
  });
});
