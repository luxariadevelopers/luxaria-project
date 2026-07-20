import { describe, expect, it } from 'vitest';
import {
  customerCreateSchema,
  isValidAadhaar,
  isValidContactPhone,
  isValidPan,
} from './validation';
import { CustomerFundingType } from './types';

describe('customer create validation', () => {
  it('validates PAN, Aadhaar, and phone formats', () => {
    expect(isValidPan('AAAAA1111A')).toBe(true);
    expect(isValidPan('BAD')).toBe(false);
    expect(isValidAadhaar('123456789012')).toBe(true);
    expect(isValidAadhaar('12345')).toBe(false);
    expect(isValidContactPhone('9876543210')).toBe(true);
    expect(isValidContactPhone('1876543210')).toBe(false);
  });

  it('requires loan bank for bank_loan funding', () => {
    const result = customerCreateSchema.safeParse({
      fullName: 'Ravi',
      pan: '',
      aadhaar: '',
      email: '',
      phone: '',
      alternatePhone: '',
      occupation: '',
      fundingType: CustomerFundingType.BankLoan,
      loanBank: '',
      addressLine1: '',
      city: '',
      state: '',
      pincode: '',
      jointFullName: '',
      jointRelationship: '',
      jointPan: '',
      jointAadhaar: '',
      jointPhone: '',
      jointEmail: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects loan bank for own_funds', () => {
    const result = customerCreateSchema.safeParse({
      fullName: 'Ravi',
      pan: 'AAAAA1111A',
      aadhaar: '',
      email: '',
      phone: '9876543210',
      alternatePhone: '',
      occupation: '',
      fundingType: CustomerFundingType.OwnFunds,
      loanBank: 'HDFC',
      addressLine1: '',
      city: '',
      state: '',
      pincode: '',
      jointFullName: '',
      jointRelationship: '',
      jointPan: '',
      jointAadhaar: '',
      jointPhone: '',
      jointEmail: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts own funds with valid contact and PAN', () => {
    const result = customerCreateSchema.safeParse({
      fullName: 'Ravi Kumar',
      pan: 'AAAAA1111A',
      aadhaar: '1234 5678 9012',
      email: 'ravi@example.com',
      phone: '9876543210',
      alternatePhone: '',
      occupation: 'Engineer',
      fundingType: CustomerFundingType.OwnFunds,
      loanBank: '',
      addressLine1: '',
      city: '',
      state: '',
      pincode: '',
      jointFullName: '',
      jointRelationship: '',
      jointPan: '',
      jointAadhaar: '',
      jointPhone: '',
      jointEmail: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aadhaar).toBe('123456789012');
      expect(result.data.pan).toBe('AAAAA1111A');
    }
  });
});
