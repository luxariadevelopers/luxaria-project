import type { Types } from 'mongoose';
import type {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from './schemas/customer-receipt.schema';

export type PublicCustomerReceiptAllocation = {
  id: string;
  demandId: string;
  scheduleLineId: string | null;
  milestone: string | null;
  amount: number;
};

export type PublicCustomerReceipt = {
  id: string;
  receiptNumber: string;
  customerId: string;
  bookingId: string;
  unitId: string;
  projectId: string;
  receiptDate: Date;
  amount: number;
  paymentMode: CustomerReceiptPaymentMode;
  companyBankAccountId: string | null;
  transactionReference: string | null;
  sourceType: CustomerReceiptSourceType;
  loanBank: string | null;
  scheduleAllocation: PublicCustomerReceiptAllocation[];
  allocatedAmount: number;
  unallocatedAmount: number;
  receiptDocument: string | null;
  receiptPdfPath: string | null;
  status: CustomerReceiptStatus;
  journalEntryId: string | null;
  remarks: string | null;
  postedBy: string | null;
  postedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export function toPublicCustomerReceipt(row: {
  _id: Types.ObjectId | string;
  receiptNumber: string;
  customerId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  receiptDate: Date;
  amount: number;
  paymentMode: CustomerReceiptPaymentMode;
  companyBankAccountId?: Types.ObjectId | string | null;
  transactionReference?: string | null;
  sourceType: CustomerReceiptSourceType;
  loanBank?: string | null;
  scheduleAllocation?: Array<{
    _id?: Types.ObjectId | string;
    demandId: Types.ObjectId | string;
    scheduleLineId?: Types.ObjectId | string | null;
    milestone?: string | null;
    amount: number;
  }>;
  allocatedAmount: number;
  unallocatedAmount: number;
  receiptDocument?: string | null;
  receiptPdfPath?: string | null;
  status: CustomerReceiptStatus;
  journalEntryId?: Types.ObjectId | string | null;
  remarks?: string | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicCustomerReceipt {
  return {
    id: String(row._id),
    receiptNumber: row.receiptNumber,
    customerId: String(row.customerId),
    bookingId: String(row.bookingId),
    unitId: String(row.unitId),
    projectId: String(row.projectId),
    receiptDate: row.receiptDate,
    amount: row.amount,
    paymentMode: row.paymentMode,
    companyBankAccountId: oid(row.companyBankAccountId),
    transactionReference: row.transactionReference ?? null,
    sourceType: row.sourceType,
    loanBank: row.loanBank ?? null,
    scheduleAllocation: (row.scheduleAllocation ?? []).map((a) => ({
      id: String(a._id),
      demandId: String(a.demandId),
      scheduleLineId: oid(a.scheduleLineId),
      milestone: a.milestone ?? null,
      amount: a.amount,
    })),
    allocatedAmount: row.allocatedAmount,
    unallocatedAmount: row.unallocatedAmount,
    receiptDocument: row.receiptDocument ?? null,
    receiptPdfPath: row.receiptPdfPath ?? null,
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    remarks: row.remarks ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
