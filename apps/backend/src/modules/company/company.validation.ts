import { BadRequestException } from '@nestjs/common';

/** Indian PAN: 5 letters + 4 digits + 1 letter */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Indian TAN: 4 letters + 5 digits + 1 letter */
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

/** GSTIN: 15 chars */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** CIN (approx): U/L + 5 digits + 2 state + 4 year + 3 type + 6 digits */
export const CIN_REGEX = /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

export function normalizeOptionalCode(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim().toUpperCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function assertValidPan(value: string | null): void {
  if (value && !PAN_REGEX.test(value)) {
    throw new BadRequestException('Invalid PAN format');
  }
}

export function assertValidTan(value: string | null): void {
  if (value && !TAN_REGEX.test(value)) {
    throw new BadRequestException('Invalid TAN format');
  }
}

export function assertValidGstin(value: string | null): void {
  if (value && !GSTIN_REGEX.test(value)) {
    throw new BadRequestException('Invalid GSTIN format');
  }
}

export function assertValidCin(value: string | null): void {
  if (value && !CIN_REGEX.test(value)) {
    throw new BadRequestException('Invalid CIN format');
  }
}

export function assertNonNegativeCapital(amount: number, label: string): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new BadRequestException(`${label} must be a non-negative number`);
  }
}

export function assertPaidUpNotExceedAuthorised(paidUp: number, authorised: number): void {
  if (paidUp > authorised) {
    throw new BadRequestException('Paid-up share capital cannot exceed authorised share capital');
  }
}
