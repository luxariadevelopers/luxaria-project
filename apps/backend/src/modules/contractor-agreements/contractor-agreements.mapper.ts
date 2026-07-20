import type { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import type {
  ContractorAgreementBillingCycle,
  ContractorAgreementExpiryAlertType,
  ContractorAgreementStatus,
} from './schemas/contractor-agreement.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

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
  agreedRates: number;
  agreedQuantity: number;
  manpowerCommitment: number;
  skillMix: Array<{ skill: string; headcount: number }>;
  startDate: Date;
  endDate: Date;
  billingCycle: ContractorAgreementBillingCycle;
  advance: { amount: number; terms: string | null };
  advanceDisbursementJournalId: string | null;
  advanceDisbursedAt: Date | null;
  advanceDisbursedBy: string | null;
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
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  terminatedBy: string | null;
  terminatedAt: Date | null;
  terminationReason: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicExpiryAlert = {
  id: string;
  agreementId: string;
  agreementNumber: string;
  projectId: string;
  contractorId: string;
  endDate: Date;
  alertType: ContractorAgreementExpiryAlertType;
  message: string;
  daysRemaining: number;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  createdAt?: Date;
};

type AgreementLike = {
  _id: Types.ObjectId | string;
  agreementNumber: string;
  version: number;
  supersedesId?: Types.ObjectId | string | null;
  contractorId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  workScope: string;
  boqItems?: Array<{
    _id?: Types.ObjectId | string;
    boqItemId?: Types.ObjectId | string | null;
    boqCode?: string | null;
    description: string;
    unit: BoqUnit;
    agreedQuantity: number;
    agreedRate: number;
    agreedValue: number;
  }>;
  agreedRatesTotal?: number;
  agreedQuantity: number;
  manpowerCommitment: number;
  skillMix?: Array<{ skill: string; headcount: number }>;
  startDate: Date;
  endDate: Date;
  billingCycle: ContractorAgreementBillingCycle;
  advance?: { amount?: number; terms?: string | null };
  advanceDisbursementJournalId?: Types.ObjectId | string | null;
  advanceDisbursedAt?: Date | null;
  advanceDisbursedBy?: Types.ObjectId | string | null;
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
  status: ContractorAgreementStatus;
  approvalRequestId?: Types.ObjectId | string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  terminatedBy?: Types.ObjectId | string | null;
  terminatedAt?: Date | null;
  terminationReason?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicContractorAgreement(
  row: AgreementLike,
): PublicContractorAgreement {
  return {
    id: String(row._id),
    agreementNumber: row.agreementNumber,
    version: row.version,
    supersedesId: oid(row.supersedesId),
    contractorId: String(row.contractorId),
    projectId: String(row.projectId),
    workScope: row.workScope,
    boqItems: (row.boqItems ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      boqItemId: oid(item.boqItemId),
      boqCode: item.boqCode ?? null,
      description: item.description,
      unit: item.unit,
      agreedQuantity: item.agreedQuantity,
      agreedRate: item.agreedRate,
      agreedValue: item.agreedValue,
    })),
    agreedRates: row.agreedRatesTotal ?? 0,
    agreedQuantity: row.agreedQuantity,
    manpowerCommitment: row.manpowerCommitment,
    skillMix: row.skillMix ?? [],
    startDate: row.startDate,
    endDate: row.endDate,
    billingCycle: row.billingCycle,
    advance: {
      amount: row.advance?.amount ?? 0,
      terms: row.advance?.terms ?? null,
    },
    advanceDisbursementJournalId: oid(row.advanceDisbursementJournalId),
    advanceDisbursedAt: row.advanceDisbursedAt ?? null,
    advanceDisbursedBy: oid(row.advanceDisbursedBy),
    recoveryPlan: {
      method: row.recoveryPlan?.method ?? null,
      percentPerBill: row.recoveryPlan?.percentPerBill ?? null,
      notes: row.recoveryPlan?.notes ?? null,
    },
    retentionPercentage: row.retentionPercentage,
    penalties: row.penalties ?? null,
    safetyTerms: row.safetyTerms ?? null,
    terminationTerms: row.terminationTerms ?? null,
    agreementDocument: row.agreementDocument ?? null,
    status: row.status,
    approvalRequestId: oid(row.approvalRequestId),
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    terminatedBy: oid(row.terminatedBy),
    terminatedAt: row.terminatedAt ?? null,
    terminationReason: row.terminationReason ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicExpiryAlert(row: {
  _id: Types.ObjectId | string;
  agreementId: Types.ObjectId | string;
  agreementNumber: string;
  projectId: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  endDate: Date;
  alertType: ContractorAgreementExpiryAlertType;
  message: string;
  daysRemaining: number;
  acknowledged?: boolean;
  acknowledgedBy?: Types.ObjectId | string | null;
  acknowledgedAt?: Date | null;
  createdAt?: Date;
}): PublicExpiryAlert {
  return {
    id: String(row._id),
    agreementId: String(row.agreementId),
    agreementNumber: row.agreementNumber,
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    endDate: row.endDate,
    alertType: row.alertType,
    message: row.message,
    daysRemaining: row.daysRemaining,
    acknowledged: row.acknowledged ?? false,
    acknowledgedBy: oid(row.acknowledgedBy),
    acknowledgedAt: row.acknowledgedAt ?? null,
    createdAt: row.createdAt,
  };
}
