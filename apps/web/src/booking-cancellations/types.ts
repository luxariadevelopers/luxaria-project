/**
 * Mirrors `apps/backend/src/modules/booking-cancellations` public shapes.
 * Nest status machine:
 * Requested → Reviewed → (PendingApproval) → Approved → RefundProcessed → UnitReleased
 */

export const BookingCancellationStatus = {
  Requested: 'requested',
  Reviewed: 'reviewed',
  PendingApproval: 'pending_approval',
  Approved: 'approved',
  RefundProcessed: 'refund_processed',
  UnitReleased: 'unit_released',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;

export type BookingCancellationStatus =
  (typeof BookingCancellationStatus)[keyof typeof BookingCancellationStatus];

export type PublicCancellationDocument = {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  category: string;
  uploadedBy: string | null;
  uploadedAt: string;
};

export type PublicBookingCancellation = {
  id: string;
  cancellationNumber: string;
  bookingId: string;
  customerId: string;
  projectId: string;
  unitId: string;
  cancellationReason: string;
  cancellationDate: string;
  totalReceived: number;
  cancellationCharge: number;
  deductions: number;
  approvedRefund: number;
  refundBankAccountId: string | null;
  refundTransactionId: string | null;
  refundProcessedAt: string | null;
  refundProcessedBy: string | null;
  approvalRequestId: string | null;
  documents: PublicCancellationDocument[];
  status: BookingCancellationStatus;
  journalEntryId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  unitReleasedBy: string | null;
  unitReleasedAt: string | null;
  remarks: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListBookingCancellationsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: BookingCancellationStatus;
  bookingId?: string;
  projectId?: string;
  customerId?: string;
  sortOrder?: 'asc' | 'desc';
};

export type RequestBookingCancellationInput = {
  bookingId: string;
  cancellationReason: string;
  cancellationDate?: string;
  cancellationCharge?: number;
  deductions?: number;
  remarks?: string | null;
};

export type ReviewBookingCancellationInput = {
  cancellationCharge?: number;
  deductions?: number;
  remarks?: string | null;
};

export type ApproveBookingCancellationInput = {
  comment?: string | null;
};

export type RejectBookingCancellationInput = {
  reason: string;
};

export type ProcessRefundInput = {
  refundBankAccountId: string;
  refundTransactionId: string;
  refundDate?: string;
};

export type PaginatedBookingCancellations = {
  items: PublicBookingCancellation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** Minimal booking row for cancellation request selector. */
export type BookingOption = {
  id: string;
  bookingNumber: string;
  status: string;
  customerId: string;
  unitId: string;
  projectId: string;
};

export type BankAccountOption = {
  id: string;
  label: string;
};
