import {
  VendorStatus,
  VendorVerificationStatus,
  type VendorListRow,
} from './types';

export type VendorUiState = {
  isBlocked: boolean;
  canVerify: boolean;
  canActivate: boolean;
  canBlock: boolean;
};

/**
 * Client preview of Nest lifecycle rules (vendors.service):
 * create → pending_verification → verify → active; block → blocked;
 * activate requires verified and not blocked.
 */
export function vendorUiState(row: VendorListRow): VendorUiState {
  const isBlocked = row.status === VendorStatus.Blocked;
  return {
    isBlocked,
    canVerify: row.verificationStatus === VendorVerificationStatus.Pending,
    canActivate:
      row.verificationStatus === VendorVerificationStatus.Verified &&
      !isBlocked &&
      row.status !== VendorStatus.Active,
    canBlock: !isBlocked,
  };
}
