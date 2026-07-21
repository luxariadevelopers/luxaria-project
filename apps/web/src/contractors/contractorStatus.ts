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
  isSuspended: boolean;
  canVerify: boolean;
  canActivate: boolean;
  canBlock: boolean;
  canSuspend: boolean;
  canReactivate: boolean;
};

export function contractorUiState(row: ContractorUiInput): ContractorUiState {
  const isBlocked = row.status === ContractorStatus.Blocked;
  const isSuspended = row.status === ContractorStatus.Suspended;
  return {
    isBlocked,
    isSuspended,
    canVerify:
      row.verificationStatus === ContractorVerificationStatus.Pending,
    canActivate:
      row.verificationStatus === ContractorVerificationStatus.Verified &&
      !isBlocked &&
      !isSuspended &&
      row.status !== ContractorStatus.Active,
    canBlock: !isBlocked,
    canSuspend: row.status === ContractorStatus.Active,
    canReactivate: isBlocked || isSuspended,
  };
}
