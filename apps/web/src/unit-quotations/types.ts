export const UnitQuotationStatus = {
  Draft: 'draft',
  Issued: 'issued',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Expired: 'expired',
  Superseded: 'superseded',
  Converted: 'converted',
} as const;

export type UnitQuotationStatus =
  (typeof UnitQuotationStatus)[keyof typeof UnitQuotationStatus];

export type PublicUnitQuotation = {
  id: string;
  quotationNumber: string;
  projectId: string;
  unitId: string;
  leadId: string | null;
  customerId: string | null;
  status: UnitQuotationStatus;
  validUntil: string | null;
  totals: { subtotal: number; taxTotal: number; grandTotal: number };
  notes: string | null;
  createdAt?: string;
};

export type UnitQuotationListRow = Pick<
  PublicUnitQuotation,
  | 'id'
  | 'quotationNumber'
  | 'projectId'
  | 'unitId'
  | 'customerId'
  | 'status'
  | 'validUntil'
  | 'totals'
  | 'createdAt'
>;

export type ListUnitQuotationsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  unitId?: string;
  customerId?: string;
  status?: UnitQuotationStatus;
};

export type PaginatedUnitQuotations = {
  items: UnitQuotationListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
