/**
 * Mirrors Nest `PublicContractorBill` /
 * `apps/backend/src/modules/contractor-bills`.
 */

import { ContractorBillStatus } from '@/status';

export { ContractorBillStatus };
export type { ContractorBillStatus as ContractorBillStatusType } from '@/status';

export type PublicContractorBillMeasurement = {
  id: string;
  measurementId: string;
  measurementNumber: string | null;
  boqItemId: string;
  boqCode: string | null;
  description: string | null;
  unit: string;
  previousQuantity: number;
  currentQuantity: number;
  cumulativeQuantity: number;
  rate: number;
  amount: number;
};

export type PublicContractorBill = {
  id: string;
  billNumber: string;
  raNumber: number;
  contractorId: string;
  projectId: string;
  agreementId: string;
  billingPeriod: { from: string; to: string };
  measurements: PublicContractorBillMeasurement[];
  previousCertifiedValue: number;
  currentCertifiedValue: number;
  cumulativeValue: number;
  advanceRecovery: number;
  materialRecovery: number;
  retention: number;
  tds: number;
  penalty: number;
  otherDeductions: number;
  netPayable: number;
  paidAmount: number;
  remainingPayable: number;
  invoiceDocument: string | null;
  status: ContractorBillStatus;
  notes: string | null;
  rejectionReason: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  engineerVerifiedBy: string | null;
  engineerVerifiedAt: string | null;
  pmCertifiedBy: string | null;
  pmCertifiedAt: string | null;
  financeVerifiedBy: string | null;
  financeVerifiedAt: string | null;
  directorApprovedBy: string | null;
  directorApprovedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  paidBy: string | null;
  paidAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListContractorBillsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  contractorId?: string;
  agreementId?: string;
  status?: ContractorBillStatus;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedContractorBills = {
  items: PublicContractorBill[];
  meta: PaginationMeta;
};

export type BillingPeriodInput = {
  from: string;
  to: string;
};

export type CreateContractorBillInput = {
  projectId: string;
  contractorId: string;
  agreementId: string;
  billingPeriod: BillingPeriodInput;
  measurementIds: string[];
  advanceRecovery?: number;
  materialRecovery?: number;
  retention?: number;
  tds?: number;
  penalty?: number;
  otherDeductions?: number;
  invoiceDocument?: string | null;
  notes?: string | null;
};

export type UpdateContractorBillInput = {
  billingPeriod?: BillingPeriodInput;
  measurementIds?: string[];
  advanceRecovery?: number;
  materialRecovery?: number;
  retention?: number;
  tds?: number;
  penalty?: number;
  otherDeductions?: number;
  invoiceDocument?: string | null;
  notes?: string | null;
};

export type WorkflowNoteInput = {
  notes?: string | null;
};

export type RejectContractorBillInput = {
  reason: string;
};

/** Nest `PublicWorkMeasurement` (eligible selector). */
export type EligibleWorkMeasurement = {
  id: string;
  measurementNumber: string;
  projectId: string;
  contractorId: string;
  boqItemId: string;
  boqCode: string | null;
  location: string;
  measurementDate: string;
  previousQuantity: number;
  currentQuantity: number;
  cumulativeQuantity: number;
  unit: string;
  status: string;
  boqPlannedQuantity: number;
};

/** Nest `PublicContractorAgreement` (rate / retention defaults). */
export type AgreementBoqItemOption = {
  id: string;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: string;
  agreedQuantity: number;
  agreedRate: number;
  agreedValue: number;
};

export type ContractorAgreementOption = {
  id: string;
  agreementNumber: string;
  version: number;
  contractorId: string;
  projectId: string;
  workScope: string;
  status: string;
  retentionPercentage: number;
  advance: { amount: number; terms: string | null };
  recoveryPlan: {
    method: string | null;
    percentPerBill: number | null;
    notes: string | null;
  };
  boqItems: AgreementBoqItemOption[];
};

export type ContractorOption = {
  id: string;
  contractorCode: string;
  legalName: string;
  status: string;
};
