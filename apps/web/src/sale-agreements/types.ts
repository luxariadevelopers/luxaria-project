export const SaleAgreementStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Approved: 'approved',
  Executed: 'executed',
  Cancelled: 'cancelled',
  Superseded: 'superseded',
} as const;

export type SaleAgreementStatus =
  (typeof SaleAgreementStatus)[keyof typeof SaleAgreementStatus];

export type PublicSaleAgreement = {
  id: string;
  agreementNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  status: SaleAgreementStatus;
  agreementValue: number;
  createdAt?: string;
};

export type SaleAgreementListRow = Pick<
  PublicSaleAgreement,
  | 'id'
  | 'agreementNumber'
  | 'projectId'
  | 'bookingId'
  | 'customerId'
  | 'unitId'
  | 'status'
  | 'agreementValue'
  | 'createdAt'
>;

export type ListSaleAgreementsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  bookingId?: string;
  customerId?: string;
  unitId?: string;
  status?: SaleAgreementStatus;
};

export type PaginatedSaleAgreements = {
  items: SaleAgreementListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
