import {
  InvestorKycStatus,
  InvestorStatus,
  type InvestorListRow,
  type PublicInvestor,
} from './types';

export type InvestorUiState = {
  /** KYC rejected — blocked from clean activation path. */
  kycRejected: boolean;
  /** Status inactive — blocked / deactivated. */
  statusBlocked: boolean;
  /** Eligible for activation (KYC verified, not already active). */
  canActivate: boolean;
  /** Eligible for deactivation. */
  canDeactivate: boolean;
  /** Eligible for KYC verify/reject action. */
  canReviewKyc: boolean;
};

type InvestorStatusFields = Pick<
  InvestorListRow | PublicInvestor,
  'kycStatus' | 'status'
>;

export function investorUiState(row: InvestorStatusFields): InvestorUiState {
  const kycRejected = row.kycStatus === InvestorKycStatus.Rejected;
  const statusBlocked = row.status === InvestorStatus.Inactive;
  const kycVerified = row.kycStatus === InvestorKycStatus.Verified;

  return {
    kycRejected,
    statusBlocked,
    canActivate: kycVerified && row.status !== InvestorStatus.Active,
    canDeactivate: row.status === InvestorStatus.Active,
    canReviewKyc:
      row.kycStatus === InvestorKycStatus.Pending ||
      row.kycStatus === InvestorKycStatus.Rejected,
  };
}

export function kycStatusLabel(status: string): string {
  switch (status) {
    case InvestorKycStatus.Pending:
      return 'KYC pending';
    case InvestorKycStatus.Verified:
      return 'KYC verified';
    case InvestorKycStatus.Rejected:
      return 'KYC rejected';
    default:
      return status;
  }
}

export function investorStatusLabel(status: string): string {
  switch (status) {
    case InvestorStatus.Draft:
      return 'Draft';
    case InvestorStatus.PendingKyc:
      return 'Pending KYC';
    case InvestorStatus.Active:
      return 'Active';
    case InvestorStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export function investorTypeLabel(type: string): string {
  switch (type) {
    case 'individual':
      return 'Individual';
    case 'company':
      return 'Company';
    case 'partnership':
      return 'Partnership';
    case 'trust':
      return 'Trust';
    case 'director_as_project_investor':
      return 'Director (project)';
    default:
      return type;
  }
}
