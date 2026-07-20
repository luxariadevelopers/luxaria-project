import { describe, expect, it } from 'vitest';
import { listRowHasBankFields, toInvestorListRow } from './listProjection';
import {
  InvestorKycStatus,
  InvestorStatus,
  InvestorType,
  type PublicInvestor,
} from './types';

describe('toInvestorListRow — no bank in lists', () => {
  it('strips bankDetails from API payload', () => {
    const api: PublicInvestor = {
      id: 'abc',
      companyId: null,
      investorCode: 'INV-001',
      investorType: InvestorType.Individual,
      legalName: 'Seed Investor',
      pan: 'AAAAA1111A',
      gstin: null,
      cin: null,
      userId: null,
      directorId: null,
      contact: {
        email: 'a@example.com',
        phone: '999',
        alternatePhone: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        pincode: null,
        country: 'India',
      },
      bankDetails: {
        bankName: 'HDFC',
        branchName: 'Main',
        ifsc: 'HDFC0001234',
        accountHolderName: 'Seed',
        accountNumber: '123456789012',
        accountNumberLast4: '9012',
      },
      kycStatus: InvestorKycStatus.Pending,
      kycVerifiedBy: null,
      kycVerifiedAt: null,
      kycNotes: null,
      status: InvestorStatus.Draft,
    };

    const listRow = toInvestorListRow(api);
    expect(listRowHasBankFields(listRow)).toBe(false);
    expect(listRow).not.toHaveProperty('bankDetails');
    expect(listRow.legalName).toBe('Seed Investor');
    expect(listRow.email).toBe('a@example.com');
    expect(Object.keys(listRow).sort()).toEqual(
      [
        'cin',
        'directorId',
        'email',
        'gstin',
        'id',
        'investorCode',
        'investorType',
        'kycNotes',
        'kycStatus',
        'legalName',
        'pan',
        'phone',
        'status',
      ].sort(),
    );
  });
});
