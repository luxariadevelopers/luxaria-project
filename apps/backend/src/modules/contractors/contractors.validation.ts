import { BadRequestException } from '@nestjs/common';
import {
  assertValidGstin,
  assertValidPan,
} from '../company/company.validation';
import {
  ContractorStatus,
  ContractorStatusAction,
} from './schemas/contractor.schema';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const WORK_CATEGORY_REGEX = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const STATUS_TRANSITIONS: Record<
  ContractorStatusAction,
  { from: ContractorStatus[]; to: ContractorStatus }
> = {
  [ContractorStatusAction.Suspend]: {
    from: [ContractorStatus.Active],
    to: ContractorStatus.Suspended,
  },
  [ContractorStatusAction.Blacklist]: {
    from: [
      ContractorStatus.Active,
      ContractorStatus.Suspended,
      ContractorStatus.PendingVerification,
    ],
    to: ContractorStatus.Blocked,
  },
  [ContractorStatusAction.Reactivate]: {
    from: [ContractorStatus.Suspended, ContractorStatus.Blocked],
    to: ContractorStatus.Active,
  },
  [ContractorStatusAction.Deactivate]: {
    from: [
      ContractorStatus.Active,
      ContractorStatus.Suspended,
      ContractorStatus.PendingVerification,
    ],
    to: ContractorStatus.Inactive,
  },
  [ContractorStatusAction.Activate]: {
    from: [
      ContractorStatus.PendingVerification,
      ContractorStatus.Inactive,
      ContractorStatus.Draft,
    ],
    to: ContractorStatus.Active,
  },
  [ContractorStatusAction.Verify]: {
    from: [
      ContractorStatus.Draft,
      ContractorStatus.PendingVerification,
      ContractorStatus.Inactive,
    ],
    to: ContractorStatus.Active,
  },
  [ContractorStatusAction.Reject]: {
    from: [
      ContractorStatus.Draft,
      ContractorStatus.PendingVerification,
    ],
    to: ContractorStatus.PendingVerification,
  },
};

export function assertContractorStatusTransition(
  action: ContractorStatusAction,
  from: ContractorStatus,
): ContractorStatus {
  const rule = STATUS_TRANSITIONS[action];
  if (!rule.from.includes(from)) {
    throw new BadRequestException(
      `Cannot ${action} contractor from status "${from}"`,
    );
  }
  return rule.to;
}

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

export function assertComplianceDates(
  input: {
    validFrom?: Date | string | null;
    validTo?: Date | string | null;
  },
  fieldLabel: string,
): void {
  if (!input.validFrom || !input.validTo) return;
  const from = new Date(input.validFrom);
  const to = new Date(input.validTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new BadRequestException(`Invalid ${fieldLabel} dates`);
  }
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException(
      `${fieldLabel}.validFrom cannot be after validTo`,
    );
  }
}

export function assertLabourLicenceDates(input: {
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
}): void {
  assertComplianceDates(input, 'labourLicence');
}

export function assertInsuranceDates(input: {
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
}): void {
  assertComplianceDates(input, 'insurance');
}

export function labourLicenceIsValid(input: {
  validTo?: Date | null;
  asOf?: Date;
}): boolean | null {
  if (!input.validTo) return null;
  const asOf = input.asOf ?? new Date();
  return input.validTo.getTime() >= asOf.getTime();
}

export function complianceIsValid(input: {
  validTo?: Date | null;
  asOf?: Date;
}): boolean | null {
  return labourLicenceIsValid(input);
}

export { IFSC_REGEX, WORK_CATEGORY_REGEX };
