import { BadRequestException } from '@nestjs/common';
import {
  assertValidGstin,
  assertValidPan,
} from '../company/company.validation';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const MATERIAL_CATEGORY_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

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

export function assertMaterialCategories(categories?: string[] | null): string[] {
  if (!categories?.length) return [];
  const normalized = categories.map((c) => c.trim().toLowerCase()).filter(Boolean);
  for (const category of normalized) {
    if (!MATERIAL_CATEGORY_REGEX.test(category)) {
      throw new BadRequestException(
        `Invalid material category "${category}". Use lowercase alphanumeric with _ or -`,
      );
    }
  }
  return [...new Set(normalized)];
}

export function assertTdsRules(input: {
  tdsApplicable?: boolean;
  tdsPercentage?: number | null;
}): void {
  if (input.tdsApplicable && (input.tdsPercentage == null || input.tdsPercentage <= 0)) {
    throw new BadRequestException(
      'tdsPercentage is required and must be > 0 when tdsApplicable is true',
    );
  }
  if (
    !input.tdsApplicable &&
    input.tdsPercentage != null &&
    input.tdsPercentage > 0
  ) {
    throw new BadRequestException(
      'tdsPercentage must be null/0 when tdsApplicable is false',
    );
  }
}

export function assertRetentionPercentage(value?: number | null): void {
  if (value == null) return;
  if (value < 0 || value > 100) {
    throw new BadRequestException('retentionPercentage must be between 0 and 100');
  }
}

export function assertRating(value?: number | null): void {
  if (value == null) return;
  if (value < 0 || value > 5) {
    throw new BadRequestException('rating must be between 0 and 5');
  }
}

export function assertCreditLimit(value?: number | null): void {
  if (value == null) return;
  if (value < 0) {
    throw new BadRequestException('creditLimit cannot be negative');
  }
}

export { IFSC_REGEX, MATERIAL_CATEGORY_REGEX };
