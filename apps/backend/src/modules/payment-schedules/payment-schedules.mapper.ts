import type { Types } from 'mongoose';
import type {
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from './schemas/payment-schedule.schema';
import type { PaymentDemandStatus } from './schemas/payment-demand.schema';

export type PublicPaymentScheduleLine = {
  id: string;
  sequence: number;
  milestone: string;
  dueDate: Date | null;
  percentage: number;
  amount: number;
  tax: number;
  collectedAmount: number;
  status: PaymentScheduleLineStatus;
  demandId: string | null;
  markedDueAt: Date | null;
  overdueAt: Date | null;
};

export type PublicPaymentSchedule = {
  id: string;
  scheduleNumber: string;
  bookingId: string;
  projectId: string;
  customerId: string;
  unitId: string;
  scheduleType: PaymentScheduleType;
  totalAmount: number;
  lines: PublicPaymentScheduleLine[];
  status: PaymentScheduleStatus;
  revisionNumber: number;
  rootScheduleId: string | null;
  revisedFromId: string | null;
  approvalRequestId: string | null;
  remarks: string | null;
  overdueLineCount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicPaymentDemand = {
  id: string;
  demandNumber: string;
  scheduleId: string;
  lineId: string;
  bookingId: string;
  projectId: string;
  customerId: string;
  milestone: string;
  dueDate: Date | null;
  amount: number;
  tax: number;
  totalAmount: number;
  status: PaymentDemandStatus;
  issuedAt: Date;
  issuedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export function toPublicPaymentSchedule(row: {
  _id: Types.ObjectId | string;
  scheduleNumber: string;
  bookingId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  scheduleType: PaymentScheduleType;
  totalAmount: number;
  lines?: Array<{
    _id?: Types.ObjectId | string;
    sequence: number;
    milestone: string;
    dueDate?: Date | null;
    percentage: number;
    amount: number;
    tax: number;
    collectedAmount?: number;
    status: PaymentScheduleLineStatus;
    demandId?: Types.ObjectId | string | null;
    markedDueAt?: Date | null;
    overdueAt?: Date | null;
  }>;
  status: PaymentScheduleStatus;
  revisionNumber: number;
  rootScheduleId?: Types.ObjectId | string | null;
  revisedFromId?: Types.ObjectId | string | null;
  approvalRequestId?: Types.ObjectId | string | null;
  remarks?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicPaymentSchedule {
  const lines = (row.lines ?? []).map((line) => ({
    id: String(line._id),
    sequence: line.sequence,
    milestone: line.milestone,
    dueDate: line.dueDate ?? null,
    percentage: line.percentage,
    amount: line.amount,
    tax: line.tax,
    collectedAmount: line.collectedAmount ?? 0,
    status: line.status,
    demandId: oid(line.demandId),
    markedDueAt: line.markedDueAt ?? null,
    overdueAt: line.overdueAt ?? null,
  }));

  return {
    id: String(row._id),
    scheduleNumber: row.scheduleNumber,
    bookingId: String(row.bookingId),
    projectId: String(row.projectId),
    customerId: String(row.customerId),
    unitId: String(row.unitId),
    scheduleType: row.scheduleType,
    totalAmount: row.totalAmount,
    lines,
    status: row.status,
    revisionNumber: row.revisionNumber,
    rootScheduleId: oid(row.rootScheduleId),
    revisedFromId: oid(row.revisedFromId),
    approvalRequestId: oid(row.approvalRequestId),
    remarks: row.remarks ?? null,
    overdueLineCount: lines.filter((l) => l.status === 'overdue').length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicPaymentDemand(row: {
  _id: Types.ObjectId | string;
  demandNumber: string;
  scheduleId: Types.ObjectId | string;
  lineId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  milestone: string;
  dueDate?: Date | null;
  amount: number;
  tax: number;
  totalAmount: number;
  status: PaymentDemandStatus;
  issuedAt: Date;
  issuedBy: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicPaymentDemand {
  return {
    id: String(row._id),
    demandNumber: row.demandNumber,
    scheduleId: String(row.scheduleId),
    lineId: String(row.lineId),
    bookingId: String(row.bookingId),
    projectId: String(row.projectId),
    customerId: String(row.customerId),
    milestone: row.milestone,
    dueDate: row.dueDate ?? null,
    amount: row.amount,
    tax: row.tax,
    totalAmount: row.totalAmount,
    status: row.status,
    issuedAt: row.issuedAt,
    issuedBy: String(row.issuedBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
