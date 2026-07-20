import { describe, expect, it } from 'vitest';
import {
  VendorStatus,
  VendorVerificationStatus,
  type VendorListRow,
} from './types';
import { vendorUiState } from './vendorStatus';

function row(partial: Partial<VendorListRow>): VendorListRow {
  return {
    id: '1',
    vendorCode: 'VEN-1',
    legalName: 'Test',
    tradeName: null,
    gstin: null,
    pan: null,
    email: null,
    phone: null,
    contactPerson: null,
    materialCategories: [],
    paymentTerms: null,
    rating: null,
    verificationStatus: VendorVerificationStatus.Pending,
    status: VendorStatus.PendingVerification,
    blockReason: null,
    ...partial,
  };
}

describe('vendorUiState', () => {
  it('marks blocked vendors and disables activate/block', () => {
    const state = vendorUiState(
      row({
        status: VendorStatus.Blocked,
        verificationStatus: VendorVerificationStatus.Verified,
        blockReason: 'Fraud',
      }),
    );
    expect(state.isBlocked).toBe(true);
    expect(state.canBlock).toBe(false);
    expect(state.canActivate).toBe(false);
  });

  it('allows activate only when verified and not blocked', () => {
    expect(
      vendorUiState(
        row({
          status: VendorStatus.PendingVerification,
          verificationStatus: VendorVerificationStatus.Verified,
        }),
      ).canActivate,
    ).toBe(true);
    expect(
      vendorUiState(
        row({
          status: VendorStatus.Active,
          verificationStatus: VendorVerificationStatus.Verified,
        }),
      ).canActivate,
    ).toBe(false);
  });
});
