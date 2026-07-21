import {
  ContractorStatus,
  ContractorVerificationStatus,
  type ContractorListRow,
} from './types';

export type ContractorUiState = {
  isBlocked: boolean;
  canVerify: boolean;
  canActivate: boolean;
  canBlock: boolean;
};

export function contractorUiState(row: ContractorListRow): ContractorUiState {
  const isBlocked = row.status === ContractorStatus.Blocked;
  return {
    isBlocked,
    canVerify:
      row.verificationStatus === ContractorVerificationStatus.Pending,
    canActivate:
      row.verificationStatus === ContractorVerificationStatus.Verified &&
      !isBlocked &&
      row.status !== ContractorStatus.Active,
    canBlock: !isBlocked,
  };
}
