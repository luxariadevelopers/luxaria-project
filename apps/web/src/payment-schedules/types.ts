/**
 * Mirrors Nest `payment-schedules` public shapes
 * (`apps/backend/src/modules/payment-schedules/payment-schedules.mapper.ts`).
 */

export const PaymentScheduleType = {
  DateBased: 'date_based',
  ConstructionMilestone: 'construction_milestone',
  Custom: 'custom',
  BankDisbursement: 'bank_disbursement',
} as const;

export type PaymentScheduleTypeValue =
  (typeof PaymentScheduleType)[keyof typeof PaymentScheduleType];

export const PaymentScheduleStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Active: 'active',
  Superseded: 'superseded',
  Cancelled: 'cancelled',
  Rejected: 'rejected',
} as const;

export type PaymentScheduleStatusValue =
  (typeof PaymentScheduleStatus)[keyof typeof PaymentScheduleStatus];

export const PaymentScheduleLineStatus = {
  Pending: 'pending',
  Due: 'due',
  Demanded: 'demanded',
  Overdue: 'overdue',
  Paid: 'paid',
  Waived: 'waived',
} as const;

export type PaymentScheduleLineStatusValue =
  (typeof PaymentScheduleLineStatus)[keyof typeof PaymentScheduleLineStatus];

export const PaymentDemandStatus = {
  Issued: 'issued',
  Cancelled: 'cancelled',
  Settled: 'settled',
} as const;

export type PaymentDemandStatusValue =
  (typeof PaymentDemandStatus)[keyof typeof PaymentDemandStatus];

export type PublicPaymentScheduleLine = {
  id: string;
  sequence: number;
  milestone: string;
  dueDate: string | null;
  percentage: number;
  amount: number;
  tax: number;
  collectedAmount: number;
  status: PaymentScheduleLineStatusValue | string;
  demandId: string | null;
  markedDueAt: string | null;
  overdueAt: string | null;
};

export type PublicPaymentSchedule = {
  id: string;
  scheduleNumber: string;
  bookingId: string;
  projectId: string;
  customerId: string;
  unitId: string;
  scheduleType: PaymentScheduleTypeValue | string;
  totalAmount: number;
  lines: PublicPaymentScheduleLine[];
  status: PaymentScheduleStatusValue | string;
  revisionNumber: number;
  rootScheduleId: string | null;
  revisedFromId: string | null;
  approvalRequestId: string | null;
  remarks: string | null;
  overdueLineCount: number;
  createdAt?: string;
  updatedAt?: string;
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
  dueDate: string | null;
  amount: number;
  tax: number;
  totalAmount: number;
  status: PaymentDemandStatusValue | string;
  issuedAt: string;
  issuedBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentScheduleLineInput = {
  sequence: number;
  milestone: string;
  dueDate?: string | null;
  percentage: number;
  amount: number;
  tax?: number;
};

export type GeneratePaymentScheduleInput = {
  bookingId: string;
  scheduleType: PaymentScheduleTypeValue;
  lines?: PaymentScheduleLineInput[];
  remarks?: string | null;
  submit?: boolean;
};

export type RevisePaymentScheduleInput = {
  scheduleType?: PaymentScheduleTypeValue;
  lines: PaymentScheduleLineInput[];
  remarks?: string | null;
  submit?: boolean;
};

export type ApprovePaymentScheduleInput = {
  comment?: string | null;
};

export type RejectPaymentScheduleInput = {
  reason: string;
};

export type GenerateDemandInput = {
  lineId: string;
  dueDate?: string | null;
};

export type MarkDueInput = {
  lineId: string;
  dueDate?: string | null;
};

export type ListPaymentSchedulesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentScheduleStatusValue;
  scheduleType?: PaymentScheduleTypeValue;
  bookingId?: string;
  projectId?: string;
  customerId?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedPaymentSchedules = {
  items: PublicPaymentSchedule[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type OverdueScheduleLineRow = {
  scheduleId: string;
  scheduleNumber: string;
  bookingId: string;
  customerId: string;
  projectId: string;
  line: {
    id: string;
    sequence: number;
    milestone: string;
    dueDate: string | null;
    percentage: number;
    amount: number;
    tax: number;
    status: PaymentScheduleLineStatusValue | string;
    overdueAt: string | null;
    demandId: string | null;
  };
};

export type PaginatedOverdueLines = {
  items: OverdueScheduleLineRow[];
  meta: PaginatedPaymentSchedules['meta'];
};

export type GenerateDemandResult = {
  schedule: PublicPaymentSchedule;
  demand: PublicPaymentDemand;
};

export type MarkOverdueJobResult = {
  marked: number;
  schedulesChecked: number;
};

export type BookingOption = {
  id: string;
  label: string;
  customerId: string;
  status: string;
  approvedPrice: number;
};

export type PaymentScheduleRelatedLabels = {
  units: Map<string, string>;
  customers: Map<string, string>;
  bookings: Map<string, string>;
};
