import type { BoqUnit } from '@/boq/types';

/** Nest `ContractorAgreementStatus` — status-enum inventory. */
export const ContractorAgreementStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Active: 'active',
  Superseded: 'superseded',
  Rejected: 'rejected',
  Expired: 'expired',
  Terminated: 'terminated',
} as const;

export type ContractorAgreementStatus =
  (typeof ContractorAgreementStatus)[keyof typeof ContractorAgreementStatus];

export const ContractorAgreementBillingCycle = {
  Weekly: 'weekly',
  Fortnightly: 'fortnightly',
  Monthly: 'monthly',
  Milestone: 'milestone',
  Completion: 'completion',
} as const;

export type ContractorAgreementBillingCycle =
  (typeof ContractorAgreementBillingCycle)[keyof typeof ContractorAgreementBillingCycle];

export const ContractorAgreementExpiryAlertType = {
  ExpiringSoon: 'expiring_soon',
  ExpiringCritical: 'expiring_critical',
  Expired: 'expired',
} as const;

export type ContractorAgreementExpiryAlertType =
  (typeof ContractorAgreementExpiryAlertType)[keyof typeof ContractorAgreementExpiryAlertType];

export type PublicAgreementBoqItem = {
  id: string;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: BoqUnit;
  agreedQuantity: number;
  agreedRate: number;
  agreedValue: number;
};

export type PublicContractorAgreement = {
  id: string;
  agreementNumber: string;
  version: number;
  supersedesId: string | null;
  contractorId: string;
  projectId: string;
  workScope: string;
  boqItems: PublicAgreementBoqItem[];
  /** Nest mapper field `agreedRates` (from agreedRatesTotal). */
  agreedRates: number;
  agreedQuantity: number;
  manpowerCommitment: number;
  skillMix: Array<{ skill: string; headcount: number }>;
  startDate: string;
  endDate: string;
  billingCycle: ContractorAgreementBillingCycle;
  advance: { amount: number; terms: string | null };
  recoveryPlan: {
    method: string | null;
    percentPerBill: number | null;
    notes: string | null;
  };
  retentionPercentage: number;
  penalties: string | null;
  safetyTerms: string | null;
  terminationTerms: string | null;
  agreementDocument: string | null;
  status: ContractorAgreementStatus;
  approvalRequestId: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  terminatedBy: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicExpiryAlert = {
  id: string;
  agreementId: string;
  agreementNumber: string;
  projectId: string;
  contractorId: string;
  endDate: string;
  alertType: ContractorAgreementExpiryAlertType;
  message: string;
  daysRemaining: number;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt?: string;
};

export type AgreementBoqItemInput = {
  boqItemId?: string | null;
  boqCode?: string | null;
  description: string;
  unit: BoqUnit;
  agreedQuantity: number;
  agreedRate: number;
};

export type AgreementSkillMixInput = {
  skill: string;
  headcount: number;
};

export type CreateContractorAgreementInput = {
  contractorId: string;
  projectId: string;
  workScope: string;
  boqItems: AgreementBoqItemInput[];
  manpowerCommitment: number;
  skillMix?: AgreementSkillMixInput[];
  startDate: string;
  endDate: string;
  billingCycle: ContractorAgreementBillingCycle;
  advance?: { amount: number; terms?: string | null };
  recoveryPlan?: {
    method?: string | null;
    percentPerBill?: number | null;
    notes?: string | null;
  };
  retentionPercentage: number;
  penalties?: string | null;
  safetyTerms?: string | null;
  terminationTerms?: string | null;
  agreementDocument?: string | null;
  notes?: string | null;
};

export type UpdateContractorAgreementInput = Partial<CreateContractorAgreementInput>;

export type AmendContractorAgreementInput = UpdateContractorAgreementInput;

export type ListContractorAgreementsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  contractorId?: string;
  status?: ContractorAgreementStatus;
  agreementNumber?: string;
};

export type ListExpiryAlertsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  alertType?: ContractorAgreementExpiryAlertType;
  unacknowledgedOnly?: boolean;
};

export type PaginatedContractorAgreements = {
  items: PublicContractorAgreement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type PaginatedExpiryAlerts = {
  items: PublicExpiryAlert[];
  meta: PaginatedContractorAgreements['meta'];
};
