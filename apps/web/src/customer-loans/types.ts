export const CustomerLoanStatus = {
  Draft: 'draft',
  Applied: 'applied',
  Sanctioned: 'sanctioned',
  Disbursing: 'disbursing',
  Closed: 'closed',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;

export type CustomerLoanStatus =
  (typeof CustomerLoanStatus)[keyof typeof CustomerLoanStatus];

export type PublicCustomerLoan = {
  id: string;
  loanNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  bankName: string | null;
  status: CustomerLoanStatus;
  sanctionAmount: number | null;
  totalDisbursed: number;
  createdAt?: string;
};

export type CustomerLoanListRow = Pick<
  PublicCustomerLoan,
  | 'id'
  | 'loanNumber'
  | 'projectId'
  | 'customerId'
  | 'unitId'
  | 'bankName'
  | 'status'
  | 'sanctionAmount'
  | 'totalDisbursed'
  | 'createdAt'
>;

export type ListCustomerLoansQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  bookingId?: string;
  customerId?: string;
  unitId?: string;
  status?: CustomerLoanStatus;
};

export type PaginatedCustomerLoans = {
  items: CustomerLoanListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
