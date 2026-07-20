import { BadRequestException } from '@nestjs/common';
import {
  assertPaidUpNotExceedAuthorised,
  assertValidCin,
  assertValidGstin,
  assertValidPan,
  assertValidTan,
  normalizeOptionalCode,
} from './company.validation';

describe('company.validation', () => {
  it('normalizes statutory codes', () => {
    expect(normalizeOptionalCode(' abcde1234f ')).toBe('ABCDE1234F');
    expect(normalizeOptionalCode('')).toBeNull();
    expect(normalizeOptionalCode(null)).toBeNull();
  });

  it('validates PAN / TAN / GSTIN / CIN', () => {
    expect(() => assertValidPan('ABCDE1234F')).not.toThrow();
    expect(() => assertValidPan('BAD')).toThrow(BadRequestException);

    expect(() => assertValidTan('CHEL12345A')).not.toThrow();
    expect(() => assertValidTan('BAD')).toThrow(BadRequestException);

    expect(() => assertValidGstin('33ABCDE1234F1Z5')).not.toThrow();
    expect(() => assertValidGstin('BAD')).toThrow(BadRequestException);

    expect(() => assertValidCin('U45200TN2020PTC123456')).not.toThrow();
    expect(() => assertValidCin('BAD')).toThrow(BadRequestException);
  });

  it('rejects paid-up above authorised', () => {
    expect(() => assertPaidUpNotExceedAuthorised(5_000_000, 10_000_000)).not.toThrow();
    expect(() => assertPaidUpNotExceedAuthorised(12_000_000, 10_000_000)).toThrow(
      BadRequestException,
    );
  });
});
