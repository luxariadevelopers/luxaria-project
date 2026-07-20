/**
 * Mirrors Nest `customer-receipts` public shapes
 * (`apps/backend/src/modules/customer-receipts`).
 */

export const CustomerReceiptPaymentMode = {
  BankTransfer: 'bank_transfer',
  Neft: 'neft',
  Rtgs: 'rtgs',
  Imps: 'imps',
  Upi: 'upi',
  Cheque: 'cheque',
  Cash: 'cash',
  Other: 'other',
} as const;

export type CustomerReceiptPaymentMode =
  (typeof CustomerReceiptPaymentMode)[keyof typeof CustomerReceiptPaymentMode];

export const CustomerReceiptSourceType = {
  OwnFund: 'own_fund',
  BankLoan: 'bank_loan',
  RefundAdjustment: 'refund_adjustment',
  Other: 'other',
} as const;

export type CustomerReceiptSourceType =
  (typeof CustomerReceiptSourceType)[keyof typeof CustomerReceiptSourceType];

export const CustomerReceiptStatus = {
  Draft: 'draft',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type CustomerReceiptStatus =
  (typeof CustomerReceiptStatus)[keyof typeof CustomerReceiptStatus];

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
  receiptDate: string;
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
  postedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ScheduleAllocationInput = {
  demandId: string;
  amount: number;
};

export type CreateCustomerReceiptInput = {
  customerId: string;
  bookingId: string;
  receiptDate?: string;
  amount: number;
  paymentMode: CustomerReceiptPaymentMode;
  companyBankAccountId?: string | null;
  transactionReference?: string | null;
  sourceType: CustomerReceiptSourceType;
  loanBank?: string | null;
  scheduleAllocation?: ScheduleAllocationInput[];
  receiptDocument?: string | null;
  remarks?: string | null;
  /** Nest posts immediately when true (`collection.approve` required). */
  post?: boolean;
};

export type CancelCustomerReceiptInput = {
  reason?: string | null;
};

export type ListCustomerReceiptsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerReceiptStatus;
  bookingId?: string;
  customerId?: string;
  projectId?: string;
  sourceType?: CustomerReceiptSourceType;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedCustomerReceipts = {
  items: PublicCustomerReceipt[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type BankAccountOption = {
  id: string;
  label: string;
};

/** Demand row derived from payment-schedule lines (for allocation UI). */
export type AllocatableDemand = {
  demandId: string;
  milestone: string;
  remainingAmount: number;
  dueDate: string | null;
};

export type BookingOption = {
  id: string;
  label: string;
  customerId: string;
  status: string;
};
