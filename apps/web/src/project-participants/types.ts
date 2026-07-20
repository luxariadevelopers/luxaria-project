/**
 * Mirrors `apps/backend/src/modules/project-participants` public shapes.
 */

export const ParticipantType = {
  Director: 'director',
  OutsideInvestor: 'outside_investor',
  Company: 'company',
  JointVentureParty: 'joint_venture_party',
} as const;

export type ParticipantType =
  (typeof ParticipantType)[keyof typeof ParticipantType];

export const InstrumentType = {
  DirectorLoan: 'director_loan',
  UnsecuredLoan: 'unsecured_loan',
  ProjectInvestment: 'project_investment',
  EquityContribution: 'equity_contribution',
  JointVentureContribution: 'joint_venture_contribution',
  Other: 'other',
} as const;

export type InstrumentType =
  (typeof InstrumentType)[keyof typeof InstrumentType];

export const ParticipantApprovalStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type ParticipantApprovalStatus =
  (typeof ParticipantApprovalStatus)[keyof typeof ParticipantApprovalStatus];

export type PublicProjectParticipant = {
  id: string;
  projectId: string;
  participantType: ParticipantType;
  participantId: string;
  participantKey: string;
  participantLabel: string | null;
  commitmentAmount: number;
  expectedContributionDate: string | null;
  actualContributionAmount: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate: number | null;
  instrumentType: InstrumentType;
  effectiveFrom: string;
  effectiveTo: string | null;
  agreementDocumentId: string | null;
  status: ParticipantApprovalStatus;
  version: number;
  supersedesId: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ActiveParticipantsPayload = {
  participants: PublicProjectParticipant[];
  totalProfitSharePercentage: number;
  isBalanced: boolean;
  note: string;
};

export type ParticipantConfiguration = {
  projectId: string;
  isFinalised: boolean;
  finalisedAt: string | null;
  finalisedBy: string | null;
  totalProfitSharePercentage: number;
  isBalanced: boolean;
  activeCount: number;
  note: string;
};

export type CreateParticipantInput = {
  participantType: ParticipantType;
  participantId: string;
  commitmentAmount: number;
  expectedContributionDate?: string | null;
  actualContributionAmount?: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate?: number | null;
  instrumentType: InstrumentType;
  effectiveFrom?: string;
  agreementDocumentId?: string | null;
  notes?: string | null;
};

export type CreateParticipantVersionInput = {
  commitmentAmount: number;
  expectedContributionDate?: string | null;
  actualContributionAmount?: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate?: number | null;
  instrumentType?: InstrumentType;
  effectiveFrom?: string;
  agreementDocumentId?: string | null;
  notes?: string | null;
};

export type UpdateParticipantInput = Partial<
  Omit<CreateParticipantInput, 'participantType' | 'participantId'>
>;
