import { BadRequestException } from '@nestjs/common';
import {
  assertContractorStatusTransition,
  assertInsuranceDates,
  assertLabourLicenceDates,
  assertRating,
  assertValidAccountNumber,
  assertValidIfsc,
  assertWorkCategories,
  labourLicenceIsValid,
} from './contractors.validation';
import {
  ContractorStatus,
  ContractorStatusAction,
} from './schemas/contractor.schema';

describe('contractors.validation', () => {
  it('validates IFSC and account number', () => {
    expect(() => assertValidIfsc('HDFC0001234')).not.toThrow();
    expect(() => assertValidIfsc('BAD')).toThrow(BadRequestException);
    expect(() => assertValidAccountNumber('123456789012')).not.toThrow();
    expect(() => assertValidAccountNumber('12')).toThrow(BadRequestException);
  });

  it('normalizes and validates work categories', () => {
    expect(assertWorkCategories(['Brickwork', 'rcc', 'brickwork'])).toEqual([
      'brickwork',
      'rcc',
    ]);
    expect(() => assertWorkCategories(['Bad Category!'])).toThrow(
      BadRequestException,
    );
  });

  it('validates rating range', () => {
    expect(() => assertRating(4.5)).not.toThrow();
    expect(() => assertRating(6)).toThrow(BadRequestException);
  });

  it('validates labour licence date order', () => {
    expect(() =>
      assertLabourLicenceDates({
        validFrom: '2026-01-01',
        validTo: '2027-01-01',
      }),
    ).not.toThrow();
    expect(() =>
      assertLabourLicenceDates({
        validFrom: '2027-01-01',
        validTo: '2026-01-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('detects expired labour licence', () => {
    expect(
      labourLicenceIsValid({
        validTo: new Date('2020-01-01'),
        asOf: new Date('2026-07-20'),
      }),
    ).toBe(false);
    expect(
      labourLicenceIsValid({
        validTo: new Date('2027-01-01'),
        asOf: new Date('2026-07-20'),
      }),
    ).toBe(true);
    expect(labourLicenceIsValid({ validTo: null })).toBeNull();
  });

  it('validates insurance date order', () => {
    expect(() =>
      assertInsuranceDates({
        validFrom: '2026-01-01',
        validTo: '2027-01-01',
      }),
    ).not.toThrow();
    expect(() =>
      assertInsuranceDates({
        validFrom: '2027-01-01',
        validTo: '2026-01-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('enforces status transitions for suspend / blacklist / reactivate', () => {
    expect(
      assertContractorStatusTransition(
        ContractorStatusAction.Suspend,
        ContractorStatus.Active,
      ),
    ).toBe(ContractorStatus.Suspended);
    expect(
      assertContractorStatusTransition(
        ContractorStatusAction.Blacklist,
        ContractorStatus.Suspended,
      ),
    ).toBe(ContractorStatus.Blocked);
    expect(
      assertContractorStatusTransition(
        ContractorStatusAction.Reactivate,
        ContractorStatus.Blocked,
      ),
    ).toBe(ContractorStatus.Active);
    expect(() =>
      assertContractorStatusTransition(
        ContractorStatusAction.Suspend,
        ContractorStatus.Blocked,
      ),
    ).toThrow(BadRequestException);
  });
});
