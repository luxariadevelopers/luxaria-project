import { BadRequestException } from '@nestjs/common';
import {
  assertValidCin,
  assertValidGstin,
  assertValidPan,
  CIN_REGEX,
} from '../company/company.validation';
import { InvestorType } from './schemas/investor.schema';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function assertInvestorTypeRules(input: {
  investorType: InvestorType;
  cin?: string | null;
  directorId?: string | null;
}): void {
  if (input.investorType === InvestorType.Company) {
    if (!input.cin) {
      throw new BadRequestException('CIN is required for company investors');
    }
    assertValidCin(input.cin);
  } else if (input.cin) {
    assertValidCin(input.cin);
  }

  if (
    input.investorType === InvestorType.DirectorAsProjectInvestor &&
    !input.directorId
  ) {
    throw new BadRequestException(
      'directorId is required when investorType is director_as_project_investor',
    );
  }
}

export function assertOptionalPanGstin(pan?: string | null, gstin?: string | null): void {
  assertValidPan(pan ?? null);
  assertValidGstin(gstin ?? null);
}

export function assertValidIfsc(ifsc?: string | null): void {
  if (ifsc && !IFSC_REGEX.test(ifsc)) {
    throw new BadRequestException('Invalid IFSC format');
  }
}

export function assertValidAccountNumber(accountNumber?: string | null): void {
  if (!accountNumber) return;
  const digits = accountNumber.replace(/\s+/g, '');
  if (!/^\d{9,18}$/.test(digits)) {
    throw new BadRequestException('accountNumber must be 9–18 digits');
  }
}

export { CIN_REGEX, IFSC_REGEX };
