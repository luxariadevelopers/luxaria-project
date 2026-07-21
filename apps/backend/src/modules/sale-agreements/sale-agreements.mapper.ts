import type { Types } from 'mongoose';
import type {
  AgreementClause,
  AgreementMilestone,
  PaymentScheduleLine,
  SaleAgreementStatus,
  StampPaper,
} from './schemas/sale-agreement.schema';

export type PublicStampPaper = {
  series: string | null;
  number: string | null;
  purchasedOn: Date | null;
  amount: number | null;
};

export type PublicPaymentScheduleLine = {
  sequence: number;
  label: string;
  dueDate: Date | null;
  amount: number;
  percent: number | null;
};

export type PublicAgreementMilestone = {
  code: string;
  label: string;
  percent: number | null;
  amount: number | null;
};

export type PublicAgreementClause = {
  title: string;
  body: string;
  order: number;
};

export type PublicSaleAgreement = {
  id: string;
  agreementNumber: string;
  companyId: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  version: number;
  rootAgreementId: string | null;
  revisedFromId: string | null;
  status: SaleAgreementStatus;
  agreementValue: number;
  stampPaper: PublicStampPaper;
  paymentScheduleSnapshot: PublicPaymentScheduleLine[];
  milestones: PublicAgreementMilestone[];
  clauses: PublicAgreementClause[];
  attachments: string[];
  requestedBy: string | null;
  requestedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  approvalRequestId: string | null;
  executedAt: Date | null;
  cancelledAt: Date | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function mapStampPaper(row?: StampPaper | null): PublicStampPaper {
  return {
    series: row?.series ?? null,
    number: row?.number ?? null,
    purchasedOn: row?.purchasedOn ?? null,
    amount: row?.amount ?? null,
  };
}

function mapPaymentLine(row: PaymentScheduleLine): PublicPaymentScheduleLine {
  return {
    sequence: row.sequence,
    label: row.label,
    dueDate: row.dueDate ?? null,
    amount: row.amount,
    percent: row.percent ?? null,
  };
}

function mapMilestone(row: AgreementMilestone): PublicAgreementMilestone {
  return {
    code: row.code,
    label: row.label,
    percent: row.percent ?? null,
    amount: row.amount ?? null,
  };
}

function mapClause(row: AgreementClause): PublicAgreementClause {
  return {
    title: row.title,
    body: row.body,
    order: row.order,
  };
}

export function toPublicSaleAgreement(row: {
  _id: Types.ObjectId | string;
  agreementNumber: string;
  companyId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  version: number;
  rootAgreementId?: Types.ObjectId | string | null;
  revisedFromId?: Types.ObjectId | string | null;
  status: SaleAgreementStatus;
  agreementValue: number;
  stampPaper?: StampPaper | null;
  paymentScheduleSnapshot?: PaymentScheduleLine[];
  milestones?: AgreementMilestone[];
  clauses?: AgreementClause[];
  attachments?: string[];
  requestedBy?: Types.ObjectId | string | null;
  requestedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  approvalRequestId?: Types.ObjectId | string | null;
  executedAt?: Date | null;
  cancelledAt?: Date | null;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSaleAgreement {
  return {
    id: String(row._id),
    agreementNumber: row.agreementNumber,
    companyId: String(row.companyId),
    projectId: String(row.projectId),
    bookingId: String(row.bookingId),
    customerId: String(row.customerId),
    unitId: String(row.unitId),
    version: row.version,
    rootAgreementId: oid(row.rootAgreementId),
    revisedFromId: oid(row.revisedFromId),
    status: row.status,
    agreementValue: row.agreementValue,
    stampPaper: mapStampPaper(row.stampPaper),
    paymentScheduleSnapshot: (row.paymentScheduleSnapshot ?? []).map(
      mapPaymentLine,
    ),
    milestones: (row.milestones ?? []).map(mapMilestone),
    clauses: (row.clauses ?? []).map(mapClause),
    attachments: row.attachments ?? [],
    requestedBy: oid(row.requestedBy),
    requestedAt: row.requestedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    approvalRequestId: oid(row.approvalRequestId),
    executedAt: row.executedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    notes: row.notes ?? null,
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
