import { apiGet, apiPatch, apiPost } from '@/api/client';

export const ParticipantType = {
  Director: 'director',
  OutsideInvestor: 'outside_investor',
} as const;

export const InstrumentType = {
  EquityContribution: 'equity_contribution',
  ProjectInvestment: 'project_investment',
  UnsecuredLoan: 'unsecured_loan',
} as const;

export const RepaymentMode = {
  Lumpsum: 'lumpsum',
  WithInterest: 'with_interest',
} as const;

export const ParticipantApprovalStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type PublicProjectParticipant = {
  id: string;
  projectId: string;
  participantType: string;
  participantId: string;
  participantKey: string;
  participantLabel: string | null;
  commitmentAmount: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate: number | null;
  budgetInvestmentPercentage: number | null;
  repaymentMode: string | null;
  instrumentType: string;
  effectiveTo: string | null;
  status: string;
  version: number;
  notes: string | null;
};

export type CreateParticipantInput = {
  participantType: string;
  participantId: string;
  commitmentAmount: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate?: number | null;
  budgetInvestmentPercentage?: number | null;
  repaymentMode?: string | null;
  instrumentType: string;
  notes?: string | null;
};

function base(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/participants`;
}

export async function fetchActiveParticipants(
  projectId: string,
): Promise<{ participants: PublicProjectParticipant[] }> {
  const res = await apiGet<{ participants: PublicProjectParticipant[] }>(
    base(projectId),
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to load participants');
  }
  return res.data;
}

export async function fetchParticipantHistory(
  projectId: string,
  query: { page?: number; limit?: number; participantKey?: string } = {},
): Promise<{ items: PublicProjectParticipant[] }> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 100;
  const res = await apiGet<PublicProjectParticipant[]>(
    `${base(projectId)}/history`,
    { ...query, page, limit },
  );
  return { items: res.data ?? [] };
}

export async function createParticipant(
  projectId: string,
  body: CreateParticipantInput,
): Promise<PublicProjectParticipant> {
  const res = await apiPost<PublicProjectParticipant>(base(projectId), body);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create participant');
  }
  return res.data;
}

export async function updateParticipant(
  projectId: string,
  recordId: string,
  body: Partial<CreateParticipantInput>,
): Promise<PublicProjectParticipant> {
  const res = await apiPatch<PublicProjectParticipant>(
    `${base(projectId)}/${encodeURIComponent(recordId)}`,
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to update participant');
  }
  return res.data;
}

export async function createParticipantVersion(
  projectId: string,
  recordId: string,
  body: Partial<CreateParticipantInput>,
): Promise<PublicProjectParticipant> {
  const res = await apiPost<PublicProjectParticipant>(
    `${base(projectId)}/${encodeURIComponent(recordId)}/versions`,
    body,
  );
  if (!res.data) {
    throw new Error(res.message || 'Failed to create version');
  }
  return res.data;
}
