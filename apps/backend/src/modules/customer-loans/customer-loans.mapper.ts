import { Types } from 'mongoose';
import type {
  CorrespondenceDirection,
  CustomerLoanStatus,
} from './schemas/customer-loan.schema';

export type PublicPendingDocument = {
  id: string;
  name: string;
  required: boolean;
  receivedAt: Date | null;
  filePath: string | null;
};

export type PublicLoanDisbursement = {
  id: string;
  stage: string;
  amount: number;
  disbursedAt: Date;
  reference: string | null;
  notes: string | null;
};

export type PublicLoanCorrespondence = {
  id: string;
  at: Date;
  subject: string;
  body: string;
  direction: CorrespondenceDirection;
};

export type PublicCustomerLoan = {
  id: string;
  loanNumber: string;
  companyId: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  bankName: string | null;
  bankBranch: string | null;
  loanAccountNumber: string | null;
  sanctionAmount: number | null;
  sanctionedAt: Date | null;
  sanctionLetterPath: string | null;
  interestRate: number | null;
  tenureMonths: number | null;
  emiAmount: number | null;
  emiStartDate: Date | null;
  status: CustomerLoanStatus;
  pendingDocuments: PublicPendingDocument[];
  disbursements: PublicLoanDisbursement[];
  correspondence: PublicLoanCorrespondence[];
  notes: string | null;
  totalDisbursed: number;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

const subdocId = (id: Types.ObjectId | string | undefined): string =>
  String(id ?? new Types.ObjectId());

function mapPendingDocument(doc: {
  _id?: Types.ObjectId | string;
  name: string;
  required: boolean;
  receivedAt?: Date | null;
  filePath?: string | null;
}): PublicPendingDocument {
  return {
    id: subdocId(doc._id),
    name: doc.name,
    required: doc.required,
    receivedAt: doc.receivedAt ?? null,
    filePath: doc.filePath ?? null,
  };
}

function mapDisbursement(doc: {
  _id?: Types.ObjectId | string;
  stage: string;
  amount: number;
  disbursedAt: Date;
  reference?: string | null;
  notes?: string | null;
}): PublicLoanDisbursement {
  return {
    id: subdocId(doc._id),
    stage: doc.stage,
    amount: doc.amount,
    disbursedAt: doc.disbursedAt,
    reference: doc.reference ?? null,
    notes: doc.notes ?? null,
  };
}

function mapCorrespondence(doc: {
  _id?: Types.ObjectId | string;
  at: Date;
  subject: string;
  body: string;
  direction: CorrespondenceDirection;
}): PublicLoanCorrespondence {
  return {
    id: subdocId(doc._id),
    at: doc.at,
    subject: doc.subject,
    body: doc.body,
    direction: doc.direction,
  };
}

export function computeTotalDisbursed(
  disbursements: { amount: number }[],
): number {
  const total = disbursements.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  return Math.round(total * 100) / 100;
}

export function toPublicCustomerLoan(row: {
  _id: Types.ObjectId | string;
  loanNumber: string;
  companyId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  bankName?: string | null;
  bankBranch?: string | null;
  loanAccountNumber?: string | null;
  sanctionAmount?: number | null;
  sanctionedAt?: Date | null;
  sanctionLetterPath?: string | null;
  interestRate?: number | null;
  tenureMonths?: number | null;
  emiAmount?: number | null;
  emiStartDate?: Date | null;
  status: CustomerLoanStatus;
  pendingDocuments?: Array<{
    _id?: Types.ObjectId | string;
    name: string;
    required: boolean;
    receivedAt?: Date | null;
    filePath?: string | null;
  }>;
  disbursements?: Array<{
    _id?: Types.ObjectId | string;
    stage: string;
    amount: number;
    disbursedAt: Date;
    reference?: string | null;
    notes?: string | null;
  }>;
  correspondence?: Array<{
    _id?: Types.ObjectId | string;
    at: Date;
    subject: string;
    body: string;
    direction: CorrespondenceDirection;
  }>;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicCustomerLoan {
  const disbursements = (row.disbursements ?? []).map(mapDisbursement);
  return {
    id: String(row._id),
    loanNumber: row.loanNumber,
    companyId: String(row.companyId),
    projectId: String(row.projectId),
    bookingId: String(row.bookingId),
    customerId: String(row.customerId),
    unitId: String(row.unitId),
    bankName: row.bankName ?? null,
    bankBranch: row.bankBranch ?? null,
    loanAccountNumber: row.loanAccountNumber ?? null,
    sanctionAmount: row.sanctionAmount ?? null,
    sanctionedAt: row.sanctionedAt ?? null,
    sanctionLetterPath: row.sanctionLetterPath ?? null,
    interestRate: row.interestRate ?? null,
    tenureMonths: row.tenureMonths ?? null,
    emiAmount: row.emiAmount ?? null,
    emiStartDate: row.emiStartDate ?? null,
    status: row.status,
    pendingDocuments: (row.pendingDocuments ?? []).map(mapPendingDocument),
    disbursements,
    correspondence: (row.correspondence ?? []).map(mapCorrespondence),
    notes: row.notes ?? null,
    totalDisbursed: computeTotalDisbursed(disbursements),
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
