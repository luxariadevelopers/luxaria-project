import { describe, expect, it } from 'vitest';
import { listRowHasBankFields, toVendorListRow } from './listProjection';
import {
  VendorStatus,
  VendorVerificationStatus,
  type PublicVendor,
} from './types';

describe('toVendorListRow — no bank in lists', () => {
  it('strips bankDetails from API payload', () => {
    const api: PublicVendor = {
      id: 'abc',
      companyId: null,
      vendorCode: 'VEN-000001',
      legalName: 'Southern Steels',
      tradeName: 'Southern',
      pan: 'AAAAA1111A',
      gstin: '33ABCDE1234F1Z5',
      contact: {
        email: 'a@example.com',
        phone: '999',
        alternatePhone: null,
        contactPerson: 'Ravi',
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        pincode: null,
        country: 'India',
      },
      billingAddress: {
        line1: null,
        line2: null,
        city: null,
        state: null,
        pincode: null,
        country: 'India',
      },
      bankDetails: {
        bankName: 'HDFC',
        branchName: 'Main',
        ifsc: 'HDFC0001234',
        accountHolderName: 'Southern',
        accountNumber: '123456789012',
        accountNumberLast4: '9012',
      },
      materialCategories: ['steel', 'cement'],
      paymentTerms: 'Net 30',
      creditLimit: 100000,
      tdsApplicable: false,
      tdsPercentage: null,
      retentionPercentage: 0,
      rating: 4,
      verificationStatus: VendorVerificationStatus.Pending,
      verifiedBy: null,
      verifiedAt: null,
      verificationNotes: null,
      status: VendorStatus.PendingVerification,
      blockReason: null,
    };

    const listRow = toVendorListRow(api);
    expect(listRowHasBankFields(listRow)).toBe(false);
    expect(listRow).not.toHaveProperty('bankDetails');
    expect(listRow.legalName).toBe('Southern Steels');
    expect(listRow.materialCategories).toEqual(['steel', 'cement']);
    expect(listRow.rating).toBe(4);
    expect(Object.keys(listRow).sort()).toEqual(
      [
        'blockReason',
        'contactPerson',
        'email',
        'gstin',
        'id',
        'legalName',
        'materialCategories',
        'pan',
        'paymentTerms',
        'phone',
        'rating',
        'status',
        'tradeName',
        'vendorCode',
        'verificationStatus',
      ].sort(),
    );
  });
});
