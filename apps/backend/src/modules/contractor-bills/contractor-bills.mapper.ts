import type { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import {
  computeRemainingBillPayable,
  toPhase6BillStatusAlias,
} from './contractor-bills.validation';
import type { ContractorBillStatus } from './schemas/contractor-bill.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicContractorBillMeasurement = {
  id: string;
  measurementId: string;
  measurementNumber: string | null;
  boqItemId: string;
  boqCode: string | null;
  description: string | null;
  unit: BoqUnit;
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
  billingPeriod: { from: Date; to: Date };
  measurements: PublicContractorBillMeasurement[];
  previousCertifiedValue: number;
  currentCertifiedValue: number;
  cumulativeValue: number;
  approvedExtras: number;
  priceEscalation: number;
  advanceRecovery: number;
  materialRecovery: number;
  equipmentRecovery: number;
  labourRecovery: number;
  retention: number;
  tds: number;
  penalty: number;
  otherDeductions: number;
  gst: number;
  netPayable: number;
  paidAmount: number;
  remainingPayable: number;
  paymentCertificateNumber: string | null;
  invoiceDocument: string | null;
  status: ContractorBillStatus;
  /** Phase 6 conceptual alias (qs_certified / payment_certified / …). */
  statusAlias: string;
  notes: string | null;
  rejectionReason: string | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  engineerVerifiedBy: string | null;
  engineerVerifiedAt: Date | null;
  pmCertifiedBy: string | null;
  pmCertifiedAt: Date | null;
  financeVerifiedBy: string | null;
  financeVerifiedAt: Date | null;
  directorApprovedBy: string | null;
  directorApprovedAt: Date | null;
  journalEntryId: string | null;
  postedBy: string | null;
  postedAt: Date | null;
  paidBy: string | null;
  paidAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type BillLike = {
  _id: Types.ObjectId | string;
  billNumber: string;
  raNumber: number;
  contractorId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  agreementId: Types.ObjectId | string;
  billingPeriod: { from: Date; to: Date };
  measurements?: Array<{
    _id?: Types.ObjectId | string;
    measurementId: Types.ObjectId | string;
    measurementNumber?: string | null;
    boqItemId: Types.ObjectId | string;
    boqCode?: string | null;
    description?: string | null;
    unit: BoqUnit;
    previousQuantity: number;
    currentQuantity: number;
    cumulativeQuantity: number;
    rate: number;
    amount: number;
  }>;
  previousCertifiedValue: number;
  currentCertifiedValue: number;
  cumulativeValue: number;
  approvedExtras?: number;
  priceEscalation?: number;
  advanceRecovery: number;
  materialRecovery: number;
  equipmentRecovery?: number;
  labourRecovery?: number;
  retention: number;
  tds: number;
  penalty: number;
  otherDeductions: number;
  gst?: number;
  netPayable: number;
  paidAmount?: number;
  paymentCertificateNumber?: string | null;
  invoiceDocument?: string | null;
  status: ContractorBillStatus;
  notes?: string | null;
  rejectionReason?: string | null;
  claimedBy?: Types.ObjectId | string | null;
  claimedAt?: Date | null;
  engineerVerifiedBy?: Types.ObjectId | string | null;
  engineerVerifiedAt?: Date | null;
  pmCertifiedBy?: Types.ObjectId | string | null;
  pmCertifiedAt?: Date | null;
  financeVerifiedBy?: Types.ObjectId | string | null;
  financeVerifiedAt?: Date | null;
  directorApprovedBy?: Types.ObjectId | string | null;
  directorApprovedAt?: Date | null;
  journalEntryId?: Types.ObjectId | string | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  paidBy?: Types.ObjectId | string | null;
  paidAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicContractorBill(row: BillLike): PublicContractorBill {
  return {
    id: String(row._id),
    billNumber: row.billNumber,
    raNumber: row.raNumber,
    contractorId: String(row.contractorId),
    projectId: String(row.projectId),
    agreementId: String(row.agreementId),
    billingPeriod: {
      from: row.billingPeriod.from,
      to: row.billingPeriod.to,
    },
    measurements: (row.measurements ?? []).map((line) => ({
      id: line._id ? String(line._id) : '',
      measurementId: String(line.measurementId),
      measurementNumber: line.measurementNumber ?? null,
      boqItemId: String(line.boqItemId),
      boqCode: line.boqCode ?? null,
      description: line.description ?? null,
      unit: line.unit,
      previousQuantity: line.previousQuantity,
      currentQuantity: line.currentQuantity,
      cumulativeQuantity: line.cumulativeQuantity,
      rate: line.rate,
      amount: line.amount,
    })),
    previousCertifiedValue: row.previousCertifiedValue,
    currentCertifiedValue: row.currentCertifiedValue,
    cumulativeValue: row.cumulativeValue,
    approvedExtras: row.approvedExtras ?? 0,
    priceEscalation: row.priceEscalation ?? 0,
    advanceRecovery: row.advanceRecovery,
    materialRecovery: row.materialRecovery,
    equipmentRecovery: row.equipmentRecovery ?? 0,
    labourRecovery: row.labourRecovery ?? 0,
    retention: row.retention,
    tds: row.tds,
    penalty: row.penalty,
    otherDeductions: row.otherDeductions,
    gst: row.gst ?? 0,
    netPayable: row.netPayable,
    paidAmount: row.paidAmount ?? 0,
    remainingPayable: computeRemainingBillPayable({
      netPayable: row.netPayable,
      paidAmount: row.paidAmount,
    }),
    paymentCertificateNumber: row.paymentCertificateNumber ?? null,
    invoiceDocument: row.invoiceDocument ?? null,
    status: row.status,
    statusAlias: toPhase6BillStatusAlias({
      status: row.status,
      netPayable: row.netPayable,
      paidAmount: row.paidAmount,
    }),
    notes: row.notes ?? null,
    rejectionReason: row.rejectionReason ?? null,
    claimedBy: oid(row.claimedBy),
    claimedAt: row.claimedAt ?? null,
    engineerVerifiedBy: oid(row.engineerVerifiedBy),
    engineerVerifiedAt: row.engineerVerifiedAt ?? null,
    pmCertifiedBy: oid(row.pmCertifiedBy),
    pmCertifiedAt: row.pmCertifiedAt ?? null,
    financeVerifiedBy: oid(row.financeVerifiedBy),
    financeVerifiedAt: row.financeVerifiedAt ?? null,
    directorApprovedBy: oid(row.directorApprovedBy),
    directorApprovedAt: row.directorApprovedAt ?? null,
    journalEntryId: oid(row.journalEntryId),
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    paidBy: oid(row.paidBy),
    paidAt: row.paidAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
