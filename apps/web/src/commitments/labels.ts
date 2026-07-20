import { CommitmentStatus, ContributionType } from './types';

export function commitmentStatusLabel(status: string): string {
  switch (status) {
    case CommitmentStatus.Draft:
      return 'Draft';
    case CommitmentStatus.Submitted:
      return 'Submitted';
    case CommitmentStatus.Approved:
      return 'Approved';
    case CommitmentStatus.Cancelled:
      return 'Cancelled';
    case CommitmentStatus.Superseded:
      return 'Superseded';
    default:
      return status;
  }
}

/** Nest `ContributionType` — funding instrument classification on commitments. */
export function contributionTypeLabel(type: string): string {
  switch (type) {
    case ContributionType.Capital:
      return 'Capital';
    case ContributionType.Equity:
      return 'Equity';
    case ContributionType.Loan:
      return 'Loan';
    case ContributionType.JointVenture:
      return 'Joint venture';
    case ContributionType.Other:
      return 'Other';
    default:
      return type;
  }
}
