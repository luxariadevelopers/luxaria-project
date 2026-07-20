import { describe, expect, it } from 'vitest';
import {
  formatMaskedAadhaarReference,
  resolveAadhaarDisplay,
} from './aadhaarMasking';
import {
  listRowHasFullAadhaarFields,
  toCustomerListRow,
} from './listProjection';
import {
  CustomerFundingType,
  CustomerKycStatus,
  CustomerStatus,
  type PublicCustomer,
} from './types';

function sampleCustomer(
  overrides: Partial<PublicCustomer> = {},
): PublicCustomer {
  return {
    id: 'cust1',
    companyId: null,
    customerCode: 'CUS-000001',
    fullName: 'Ravi Kumar',
    jointApplicant: {
      fullName: 'Sita',
      relationship: 'Spouse',
      pan: 'BBBBB2222B',
      aadhaarReference: '5678',
      aadhaar: '987654321098',
      phone: null,
      email: null,
    },
    pan: 'AAAAA1111A',
    aadhaarReference: '9012',
    aadhaar: '123456789012',
    contact: {
      email: 'ravi@example.com',
      phone: '9876543210',
      alternatePhone: null,
    },
    address: {
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      pincode: null,
      country: 'India',
    },
    occupation: null,
    fundingType: CustomerFundingType.OwnFunds,
    loanBank: null,
    kycStatus: CustomerKycStatus.Pending,
    kycVerifiedBy: null,
    kycVerifiedAt: null,
    kycNotes: null,
    status: CustomerStatus.PendingKyc,
    ...overrides,
  };
}

describe('aadhaar masking', () => {
  it('masks last-4 reference for list display', () => {
    expect(formatMaskedAadhaarReference('9012')).toBe('XXXX-XXXX-9012');
    expect(formatMaskedAadhaarReference(null)).toBe('—');
  });

  it('keeps masked by default even when decrypt is available', () => {
    const display = resolveAadhaarDisplay({
      aadhaar: '123456789012',
      aadhaarReference: '9012',
      canViewSensitive: true,
      revealed: false,
    });
    expect(display.display).toBe('XXXX-XXXX-9012');
    expect(display.canReveal).toBe(true);
    expect(display.isRevealed).toBe(false);
  });

  it('reveals formatted Aadhaar only when authorised and toggled', () => {
    const display = resolveAadhaarDisplay({
      aadhaar: '123456789012',
      aadhaarReference: '9012',
      canViewSensitive: true,
      revealed: true,
    });
    expect(display.display).toBe('1234-5678-9012');
    expect(display.isRevealed).toBe(true);
  });

  it('never reveals when customer.manage is missing', () => {
    const display = resolveAadhaarDisplay({
      aadhaar: '123456789012',
      aadhaarReference: '9012',
      canViewSensitive: false,
      revealed: true,
    });
    expect(display.display).toBe('XXXX-XXXX-9012');
    expect(display.canReveal).toBe(false);
  });
});

describe('toCustomerListRow — no full Aadhaar in lists', () => {
  it('strips aadhaar and jointApplicant from API payload', () => {
    const listRow = toCustomerListRow(sampleCustomer());
    expect(listRowHasFullAadhaarFields(listRow)).toBe(false);
    expect(listRow).not.toHaveProperty('aadhaar');
    expect(listRow).not.toHaveProperty('jointApplicant');
    expect(listRow.aadhaarReference).toBe('9012');
    expect(listRow.hasJointApplicant).toBe(true);
    expect(formatMaskedAadhaarReference(listRow.aadhaarReference)).toBe(
      'XXXX-XXXX-9012',
    );
  });
});
