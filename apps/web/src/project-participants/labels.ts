import {
  InstrumentType,
  ParticipantApprovalStatus,
  ParticipantType,
} from './types';

export function participantTypeLabel(type: ParticipantType): string {
  switch (type) {
    case ParticipantType.Director:
      return 'Director';
    case ParticipantType.OutsideInvestor:
      return 'Outside investor';
    case ParticipantType.Company:
      return 'Company';
    case ParticipantType.JointVentureParty:
      return 'Joint venture party';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function instrumentTypeLabel(type: InstrumentType): string {
  switch (type) {
    case InstrumentType.DirectorLoan:
      return 'Director loan';
    case InstrumentType.UnsecuredLoan:
      return 'Unsecured loan';
    case InstrumentType.ProjectInvestment:
      return 'Project investment';
    case InstrumentType.EquityContribution:
      return 'Equity contribution';
    case InstrumentType.JointVentureContribution:
      return 'JV contribution';
    case InstrumentType.Other:
      return 'Other';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function participantStatusLabel(
  status: ParticipantApprovalStatus,
): string {
  switch (status) {
    case ParticipantApprovalStatus.Draft:
      return 'Draft';
    case ParticipantApprovalStatus.Submitted:
      return 'Submitted';
    case ParticipantApprovalStatus.Approved:
      return 'Approved';
    case ParticipantApprovalStatus.Rejected:
      return 'Rejected';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatProfitSharePercent(percentage: number): string {
  if (!Number.isFinite(percentage)) {
    return '—';
  }
  const rounded =
    Math.abs(percentage - Math.round(percentage)) < 0.0001
      ? Math.round(percentage)
      : Math.round(percentage * 100) / 100;
  return `${rounded}%`;
}
