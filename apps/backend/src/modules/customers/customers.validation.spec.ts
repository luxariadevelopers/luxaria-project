import { BadRequestException } from '@nestjs/common';
import {
  assertAllowedCustomerDocumentMime,
  assertFundingTypeRules,
  assertValidAadhaar,
  isSensitiveCustomerDocumentCategory,
  normalizeAadhaarDigits,
} from './customers.validation';
import { CustomerDocumentCategory } from './schemas/customer-document.schema';
import { CustomerFundingType } from './schemas/customer.schema';

describe('customers.validation', () => {
  it('requires loanBank for bank_loan and mixed', () => {
    expect(() =>
      assertFundingTypeRules({
        fundingType: CustomerFundingType.BankLoan,
        loanBank: null,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertFundingTypeRules({
        fundingType: CustomerFundingType.Mixed,
        loanBank: '  ',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertFundingTypeRules({
        fundingType: CustomerFundingType.BankLoan,
        loanBank: 'SBI',
      }),
    ).not.toThrow();
  });

  it('rejects loanBank when funding is own_funds', () => {
    expect(() =>
      assertFundingTypeRules({
        fundingType: CustomerFundingType.OwnFunds,
        loanBank: 'HDFC',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertFundingTypeRules({
        fundingType: CustomerFundingType.OwnFunds,
        loanBank: null,
      }),
    ).not.toThrow();
  });

  it('validates 12-digit Aadhaar', () => {
    expect(() => assertValidAadhaar('1234 5678 9012')).not.toThrow();
    expect(() => assertValidAadhaar('123456789012')).not.toThrow();
    expect(() => assertValidAadhaar('12345')).toThrow(BadRequestException);
    expect(normalizeAadhaarDigits('1234-5678-9012')).toBe('123456789012');
  });

  it('allowlists KYC document MIME types', () => {
    expect(() =>
      assertAllowedCustomerDocumentMime('application/pdf'),
    ).not.toThrow();
    expect(() => assertAllowedCustomerDocumentMime('image/jpeg')).not.toThrow();
    expect(() =>
      assertAllowedCustomerDocumentMime('application/msword'),
    ).toThrow(BadRequestException);
  });

  it('marks identity categories as sensitive', () => {
    expect(
      isSensitiveCustomerDocumentCategory(CustomerDocumentCategory.Aadhaar),
    ).toBe(true);
    expect(
      isSensitiveCustomerDocumentCategory(CustomerDocumentCategory.Kyc),
    ).toBe(true);
    expect(
      isSensitiveCustomerDocumentCategory(CustomerDocumentCategory.General),
    ).toBe(false);
  });
});
