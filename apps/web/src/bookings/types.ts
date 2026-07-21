/**
 * Web types for Nest `PublicBooking` (bookings.mapper.ts).
 * Status values mirror `BookingStatus` in booking.schema.ts / shared-types.
 */

import { BookingStatus } from '@/status';

export { BookingStatus };
export type BookingStatusValue = (typeof BookingStatus)[keyof typeof BookingStatus];

/** Nest `CustomerFundingType` on booking rows. */
export const BookingFundingType = {
  OwnFunds: 'own_funds',
  BankLoan: 'bank_loan',
  Mixed: 'mixed',
} as const;

export type BookingFundingType =
  (typeof BookingFundingType)[keyof typeof BookingFundingType];

export type PublicBookingPaymentInstallment = {
  sequence: number;
  label: string;
  dueDate: string | null;
  amount: number;
  percent: number | null;
};

export type PublicBookingPaymentPlan = {
  name: string | null;
  installments: PublicBookingPaymentInstallment[];
};

export type PublicBookingBroker = {
  name: string | null;
  firmName: string | null;
  phone: string | null;
  email: string | null;
  commissionPercent: number | null;
};

/** Nest `PublicBooking` with ISO date strings for the web client. */
export type PublicBooking = {
  id: string;
  bookingNumber: string;
  customerId: string;
  jointApplicantId: string | null;
  projectId: string;
  unitId: string;
  bookingDate: string;
  bookingAmount: number;
  agreedPrice: number;
  discount: number;
  approvedPrice: number;
  paymentPlan: PublicBookingPaymentPlan;
  broker: PublicBookingBroker;
  fundingType: BookingFundingType | string;
  remarks: string | null;
  status: BookingStatusValue | string;
  holdExpiresAt: string | null;
  discountApprovalRequired: boolean;
  discountApproved: boolean;
  approvalRequestId: string | null;
  pdfPath: string | null;
  pdfGeneratedAt: string | null;
  expiredAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListBookingsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: BookingStatusValue | string;
  projectId?: string;
  unitId?: string;
  customerId?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedBookings = {
  items: PublicBooking[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** Optional display labels resolved via existing unit/customer GETs. */
export type BookingRelatedLabels = {
  units: ReadonlyMap<string, string>;
  customers: ReadonlyMap<string, string>;
};

/** Nest `BookingPaymentInstallmentDto` */
export type BookingPaymentInstallmentInput = {
  sequence: number;
  label: string;
  dueDate?: string | null;
  amount: number;
  percent?: number | null;
};

/** Nest `BookingPaymentPlanDto` */
export type BookingPaymentPlanInput = {
  name?: string | null;
  installments?: BookingPaymentInstallmentInput[];
};

/** Nest `BookingBrokerDto` */
export type BookingBrokerInput = {
  name?: string | null;
  firmName?: string | null;
  phone?: string | null;
  email?: string | null;
  commissionPercent?: number | null;
};

/** Nest `CreateBookingDto` */
export type CreateBookingInput = {
  customerId: string;
  jointApplicantId?: string | null;
  projectId: string;
  unitId: string;
  bookingDate?: string;
  bookingAmount: number;
  agreedPrice: number;
  discount?: number;
  approvedPrice?: number;
  paymentPlan?: BookingPaymentPlanInput;
  broker?: BookingBrokerInput;
  fundingType: BookingFundingType | string;
  remarks?: string | null;
  holdHours?: number;
};

/** Nest `UpdateBookingDto` */
export type UpdateBookingInput = Partial<CreateBookingInput>;

/** Nest `TransitionBookingDto` — workflow targets only */
export type TransitionBookingInput = {
  status:
    | typeof BookingStatus.Reserved
    | typeof BookingStatus.Booked
    | typeof BookingStatus.Agreement
    | typeof BookingStatus.Registered;
};

/** Nest `CancelBookingDto` */
export type CancelBookingInput = {
  reason?: string | null;
};

/** Nest `ApproveBookingDiscountDto` */
export type ApproveBookingDiscountInput = {
  comment?: string | null;
};

/** Nest `RejectBookingDiscountDto` */
export type RejectBookingDiscountInput = {
  reason: string;
};
