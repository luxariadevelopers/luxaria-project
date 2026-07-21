import {
  ContractorStatus,
  ContractorVerificationStatus,
  type ContractorListRow,
  type PublicContractor,
} from './types';

export type ContractorUiInput = Pick<
  ContractorListRow | PublicContractor,
  'status' | 'verificationStatus'
>;

export type ContractorUiState = {
  isBlocked: boolean;
  canVerify: boolean;
  canActivate: boolean;
  canBlock: boolean;
};

export function contractorUiState(row: ContractorUiInput): ContractorUiState {
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
