import { BadRequestException } from '@nestjs/common';
import {
  assertInvestorTypeRules,
  assertValidAccountNumber,
  assertValidIfsc,
} from './investors.validation';
import { InvestorType } from './schemas/investor.schema';

describe('investors.validation', () => {
  it('requires CIN for company investors', () => {
    expect(() =>
      assertInvestorTypeRules({
        investorType: InvestorType.Company,
        cin: null,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertInvestorTypeRules({
        investorType: InvestorType.Company,
        cin: 'U45200TN2020PTC123456',
      }),
    ).not.toThrow();
  });

  it('requires directorId for director-as-project-investor', () => {
    expect(() =>
      assertInvestorTypeRules({
        investorType: InvestorType.DirectorAsProjectInvestor,
        directorId: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('validates IFSC and account number', () => {
    expect(() => assertValidIfsc('HDFC0001234')).not.toThrow();
    expect(() => assertValidIfsc('BAD')).toThrow(BadRequestException);
    expect(() => assertValidAccountNumber('123456789012')).not.toThrow();
    expect(() => assertValidAccountNumber('12')).toThrow(BadRequestException);
  });
});
