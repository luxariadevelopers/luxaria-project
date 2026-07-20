import { BadRequestException } from '@nestjs/common';
import { assertValidPan } from '../company/company.validation';
import { CustomerFundingType } from './schemas/customer.schema';
import { CustomerDocumentCategory } from './schemas/customer-document.schema';

/** 12-digit Aadhaar (spaces/hyphens allowed in input). */
export const AADHAAR_REGEX = /^\d{12}$/;

/** KYC / identity document MIME allowlist */
export const ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export function assertOptionalPan(pan?: string | null): void {
  assertValidPan(pan ?? null);
}

export function normalizeAadhaarDigits(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const digits = value.replace(/[\s-]/g, '');
  return digits.length === 0 ? null : digits;
}

export function assertValidAadhaar(aadhaar?: string | null): void {
  const digits = normalizeAadhaarDigits(aadhaar);
  if (!digits) return;
  if (!AADHAAR_REGEX.test(digits)) {
    throw new BadRequestException('aadhaar must be a 12-digit number');
  }
}

export function aadhaarReferenceLast4(aadhaar: string): string {
  const digits = normalizeAadhaarDigits(aadhaar) ?? '';
  return digits.slice(-4);
}

export function assertFundingTypeRules(input: {
  fundingType: CustomerFundingType;
  loanBank?: string | null;
}): void {
  const needsBank =
    input.fundingType === CustomerFundingType.BankLoan ||
    input.fundingType === CustomerFundingType.Mixed;

  if (needsBank && !input.loanBank?.trim()) {
    throw new BadRequestException(
      'loanBank is required when fundingType is bank_loan or mixed',
    );
  }

  if (input.fundingType === CustomerFundingType.OwnFunds && input.loanBank?.trim()) {
    throw new BadRequestException(
      'loanBank must be empty when fundingType is own_funds',
    );
  }
}

export function assertAllowedCustomerDocumentMime(mimeType?: string | null): void {
  const mime = (mimeType ?? '').toLowerCase().trim();
  if (
    !(ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES as readonly string[]).includes(mime)
  ) {
    throw new BadRequestException(
      `Unsupported document type. Allowed: ${ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES.join(', ')}`,
    );
  }
}

export function isSensitiveCustomerDocumentCategory(
  category: CustomerDocumentCategory,
): boolean {
  return (
    category === CustomerDocumentCategory.Pan ||
    category === CustomerDocumentCategory.Aadhaar ||
    category === CustomerDocumentCategory.Photo ||
    category === CustomerDocumentCategory.AddressProof ||
    category === CustomerDocumentCategory.IncomeProof ||
    category === CustomerDocumentCategory.BankStatement ||
    category === CustomerDocumentCategory.LoanSanction ||
    category === CustomerDocumentCategory.Kyc
  );
}
