import {
  CustomerFundingType,
  CustomerKycStatus,
  CustomerStatus,
  type CustomerListRow,
  type PublicCustomer,
} from './types';

export type CustomerUiState = {
  kycRejected: boolean;
  statusBlocked: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canReviewKyc: boolean;
};

type CustomerStatusFields = Pick<
  CustomerListRow | PublicCustomer,
  'kycStatus' | 'status'
>;

export function customerUiState(row: CustomerStatusFields): CustomerUiState {
  const kycRejected = row.kycStatus === CustomerKycStatus.Rejected;
  const statusBlocked = row.status === CustomerStatus.Inactive;
  const kycVerified = row.kycStatus === CustomerKycStatus.Verified;

  return {
    kycRejected,
    statusBlocked,
    canActivate: kycVerified && row.status !== CustomerStatus.Active,
    canDeactivate: row.status === CustomerStatus.Active,
    canReviewKyc:
      row.kycStatus === CustomerKycStatus.Pending ||
      row.kycStatus === CustomerKycStatus.Rejected,
  };
}

export function kycStatusLabel(status: string): string {
  switch (status) {
    case CustomerKycStatus.Pending:
      return 'KYC pending';
    case CustomerKycStatus.Verified:
      return 'KYC verified';
    case CustomerKycStatus.Rejected:
      return 'KYC rejected';
    default:
      return status;
  }
}

export function customerStatusLabel(status: string): string {
  switch (status) {
    case CustomerStatus.Draft:
      return 'Draft';
    case CustomerStatus.PendingKyc:
      return 'Pending KYC';
    case CustomerStatus.Active:
      return 'Active';
    case CustomerStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export function fundingTypeLabel(type: string): string {
  switch (type) {
    case CustomerFundingType.OwnFunds:
      return 'Own funds';
    case CustomerFundingType.BankLoan:
      return 'Bank loan';
    case CustomerFundingType.Mixed:
      return 'Mixed';
    default:
      return type;
  }
}
