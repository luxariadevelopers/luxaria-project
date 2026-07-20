import { BadRequestException } from '@nestjs/common';
import {
  assertValidAccountNumber,
  assertValidIfsc,
  IFSC_REGEX,
} from '../investors/investors.validation';
import { accountNumberLast4 } from '../../common/utils/crypto.util';

export { assertValidAccountNumber, assertValidIfsc, IFSC_REGEX };

export function normalizeAccountNumber(accountNumber: string): string {
  return accountNumber.replace(/\s+/g, '');
}

export function buildMaskedAccountNumber(accountNumber: string): string {
  const last4 = accountNumberLast4(normalizeAccountNumber(accountNumber));
  if (!last4) {
    throw new BadRequestException('Invalid account number for masking');
  }
  return `XXXXXX${last4}`;
}

export function assertOpeningBalance(value: number): void {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw new BadRequestException('openingBalance must be a finite number');
  }
}
