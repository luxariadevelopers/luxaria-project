import type { Types } from 'mongoose';
import type { CustomerFundingType } from '../customers/schemas/customer.schema';
import type { BookingStatus } from './schemas/booking.schema';

export type PublicBookingPaymentInstallment = {
  sequence: number;
  label: string;
  dueDate: Date | null;
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

export type PublicBooking = {
  id: string;
  bookingNumber: string;
  customerId: string;
  jointApplicantId: string | null;
  projectId: string;
  unitId: string;
  bookingDate: Date;
  bookingAmount: number;
  agreedPrice: number;
  discount: number;
  approvedPrice: number;
  paymentPlan: PublicBookingPaymentPlan;
  broker: PublicBookingBroker;
  fundingType: CustomerFundingType;
  remarks: string | null;
  status: BookingStatus;
  holdExpiresAt: Date | null;
  discountApprovalRequired: boolean;
  discountApproved: boolean;
  approvalRequestId: string | null;
  pdfPath: string | null;
  pdfGeneratedAt: Date | null;
  expiredAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type BookingLike = {
  _id: Types.ObjectId | string;
  bookingNumber: string;
  customerId: Types.ObjectId | string;
  jointApplicantId?: Types.ObjectId | string | null;
  projectId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  bookingDate: Date;
  bookingAmount: number;
  agreedPrice: number;
  discount: number;
  approvedPrice: number;
  paymentPlan?: {
    name?: string | null;
    installments?: Array<{
      sequence: number;
      label: string;
      dueDate?: Date | null;
      amount: number;
      percent?: number | null;
    }>;
  } | null;
  broker?: {
    name?: string | null;
    firmName?: string | null;
    phone?: string | null;
    email?: string | null;
    commissionPercent?: number | null;
  } | null;
  fundingType: CustomerFundingType;
  remarks?: string | null;
  status: BookingStatus;
  holdExpiresAt?: Date | null;
  discountApprovalRequired?: boolean;
  discountApproved?: boolean;
  approvalRequestId?: Types.ObjectId | string | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: Date | null;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export function toPublicBooking(row: BookingLike): PublicBooking {
  const plan = row.paymentPlan ?? {};
  const broker = row.broker ?? {};

  return {
    id: String(row._id),
    bookingNumber: row.bookingNumber,
    customerId: String(row.customerId),
    jointApplicantId: oid(row.jointApplicantId),
    projectId: String(row.projectId),
    unitId: String(row.unitId),
    bookingDate: row.bookingDate,
    bookingAmount: row.bookingAmount,
    agreedPrice: row.agreedPrice,
    discount: row.discount,
    approvedPrice: row.approvedPrice,
    paymentPlan: {
      name: plan.name ?? null,
      installments: (plan.installments ?? []).map((i) => ({
        sequence: i.sequence,
        label: i.label,
        dueDate: i.dueDate ?? null,
        amount: i.amount,
        percent: i.percent ?? null,
      })),
    },
    broker: {
      name: broker.name ?? null,
      firmName: broker.firmName ?? null,
      phone: broker.phone ?? null,
      email: broker.email ?? null,
      commissionPercent: broker.commissionPercent ?? null,
    },
    fundingType: row.fundingType,
    remarks: row.remarks ?? null,
    status: row.status,
    holdExpiresAt: row.holdExpiresAt ?? null,
    discountApprovalRequired: row.discountApprovalRequired ?? false,
    discountApproved: row.discountApproved ?? false,
    approvalRequestId: oid(row.approvalRequestId),
    pdfPath: row.pdfPath ?? null,
    pdfGeneratedAt: row.pdfGeneratedAt ?? null,
    expiredAt: row.expiredAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
