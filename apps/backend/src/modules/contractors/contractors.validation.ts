import { BadRequestException } from '@nestjs/common';
import {
  assertValidGstin,
  assertValidPan,
} from '../company/company.validation';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const WORK_CATEGORY_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function assertOptionalPanGstin(
  pan?: string | null,
  gstin?: string | null,
): void {
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

export function assertWorkCategories(categories?: string[] | null): string[] {
  if (!categories?.length) return [];
  const normalized = categories
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  for (const category of normalized) {
    if (!WORK_CATEGORY_REGEX.test(category)) {
      throw new BadRequestException(
        `Invalid work category "${category}". Use lowercase alphanumeric with _ or -`,
      );
    }
  }
  return [...new Set(normalized)];
}

export function assertRating(value?: number | null): void {
  if (value == null) return;
  if (value < 0 || value > 5) {
    throw new BadRequestException('rating must be between 0 and 5');
  }
}

export function assertLabourLicenceDates(input: {
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
}): void {
  if (!input.validFrom || !input.validTo) return;
  const from = new Date(input.validFrom);
  const to = new Date(input.validTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new BadRequestException('Invalid labour licence dates');
  }
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException(
      'labourLicence.validFrom cannot be after validTo',
    );
  }
}

export function labourLicenceIsValid(input: {
  validTo?: Date | null;
  asOf?: Date;
}): boolean | null {
  if (!input.validTo) return null;
  const asOf = input.asOf ?? new Date();
  return input.validTo.getTime() >= asOf.getTime();
}

export { IFSC_REGEX, WORK_CATEGORY_REGEX };
