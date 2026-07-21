import type { Types } from 'mongoose';
import type {
  TdsDeducteeType,
  TdsDeductionStatus,
  TdsPartyType,
} from './schemas/tds-deduction.schema';
import type {
  TdsFormType,
  TdsQuarter,
  TdsReturnStatus,
} from './schemas/tds-return.schema';
import type { TdsSectionStatus } from './schemas/tds-section.schema';

export type PublicTdsSection = {
  id: string;
  sectionCode: string;
  name: string;
  ratePercent: number;
  thresholdAmount: number;
  status: TdsSectionStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicTdsDeduction = {
  id: string;
  deductionNumber: string;
  companyId: string;
  projectId: string | null;
  sectionId: string;
  sectionCode: string;
  partyType: TdsPartyType;
  partyId: string | null;
  partyName: string;
  partyPan: string | null;
  deducteeType: TdsDeducteeType;
  transactionDate: Date;
  transactionAmount: number;
  tdsAmount: number;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  challanNumber: string | null;
  challanDate: Date | null;
  bsrCode: string | null;
  certificateNumber: string | null;
  status: TdsDeductionStatus;
  journalEntryId: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicTdsReturn = {
  id: string;
  returnNumber: string;
  companyId: string;
  formType: TdsFormType;
  quarter: TdsQuarter;
  financialYearLabel: string;
  status: TdsReturnStatus;
  totalDeductees: number;
  totalTransactionAmount: number;
  totalTds: number;
  acknowledgementNumber: string | null;
  filedAt: Date | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TdsRegisterRow = {
  id: string;
  deductionNumber: string;
  sectionCode: string;
  partyName: string;
  partyPan: string | null;
  transactionDate: Date;
  transactionAmount: number;
  tdsAmount: number;
  status: TdsDeductionStatus;
  challanNumber: string | null;
  certificateNumber: string | null;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicTdsSection(row: {
  _id: Types.ObjectId | string;
  sectionCode: string;
  name: string;
  ratePercent: number;
  thresholdAmount: number;
  status: TdsSectionStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicTdsSection {
  return {
    id: String(row._id),
    sectionCode: row.sectionCode,
    name: row.name,
    ratePercent: row.ratePercent,
    thresholdAmount: row.thresholdAmount,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicTdsDeduction(row: {
  _id: Types.ObjectId | string;
  deductionNumber: string;
  companyId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  sectionId: Types.ObjectId | string;
  sectionCode: string;
  partyType: TdsPartyType;
  partyId?: Types.ObjectId | string | null;
  partyName: string;
  partyPan?: string | null;
  deducteeType: TdsDeducteeType;
  transactionDate: Date;
  transactionAmount: number;
  tdsAmount: number;
  sourceModule?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  challanNumber?: string | null;
  challanDate?: Date | null;
  bsrCode?: string | null;
  certificateNumber?: string | null;
  status: TdsDeductionStatus;
  journalEntryId?: Types.ObjectId | string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicTdsDeduction {
  return {
    id: String(row._id),
    deductionNumber: row.deductionNumber,
    companyId: String(row.companyId),
    projectId: oid(row.projectId),
    sectionId: String(row.sectionId),
    sectionCode: row.sectionCode,
    partyType: row.partyType,
    partyId: oid(row.partyId),
    partyName: row.partyName,
    partyPan: row.partyPan ?? null,
    deducteeType: row.deducteeType,
    transactionDate: row.transactionDate,
    transactionAmount: row.transactionAmount,
    tdsAmount: row.tdsAmount,
    sourceModule: row.sourceModule ?? null,
    sourceEntityType: row.sourceEntityType ?? null,
    sourceEntityId: row.sourceEntityId ?? null,
    challanNumber: row.challanNumber ?? null,
    challanDate: row.challanDate ?? null,
    bsrCode: row.bsrCode ?? null,
    certificateNumber: row.certificateNumber ?? null,
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicTdsReturn(row: {
  _id: Types.ObjectId | string;
  returnNumber: string;
  companyId: Types.ObjectId | string;
  formType: TdsFormType;
  quarter: TdsQuarter;
  financialYearLabel: string;
  status: TdsReturnStatus;
  totalDeductees: number;
  totalTransactionAmount: number;
  totalTds: number;
  acknowledgementNumber?: string | null;
  filedAt?: Date | null;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicTdsReturn {
  return {
    id: String(row._id),
    returnNumber: row.returnNumber,
    companyId: String(row.companyId),
    formType: row.formType,
    quarter: row.quarter,
    financialYearLabel: row.financialYearLabel,
    status: row.status,
    totalDeductees: row.totalDeductees,
    totalTransactionAmount: row.totalTransactionAmount,
    totalTds: row.totalTds,
    acknowledgementNumber: row.acknowledgementNumber ?? null,
    filedAt: row.filedAt ?? null,
    notes: row.notes ?? null,
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toTdsRegisterRow(row: {
  _id: Types.ObjectId | string;
  deductionNumber: string;
  sectionCode: string;
  partyName: string;
  partyPan?: string | null;
  transactionDate: Date;
  transactionAmount: number;
  tdsAmount: number;
  status: TdsDeductionStatus;
  challanNumber?: string | null;
  certificateNumber?: string | null;
}): TdsRegisterRow {
  return {
    id: String(row._id),
    deductionNumber: row.deductionNumber,
    sectionCode: row.sectionCode,
    partyName: row.partyName,
    partyPan: row.partyPan ?? null,
    transactionDate: row.transactionDate,
    transactionAmount: row.transactionAmount,
    tdsAmount: row.tdsAmount,
    status: row.status,
    challanNumber: row.challanNumber ?? null,
    certificateNumber: row.certificateNumber ?? null,
  };
}
