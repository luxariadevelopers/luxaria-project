/**
 * Mirrors Nest `PublicRfq` / `apps/backend/src/modules/rfq`.
 */

export const RfqStatus = {
  Draft: 'draft',
  Issued: 'issued',
  Closed: 'closed',
  Cancelled: 'cancelled',
  Awarded: 'awarded',
} as const;

export type RfqStatus = (typeof RfqStatus)[keyof typeof RfqStatus];

export type PublicRfq = {
  id: string;
  companyId: string | null;
  projectId: string;
  siteId: string | null;
  purchaseRequestId: string;
  rfqNumber: string;
  title: string;
  status: RfqStatus;
  vendorIds: string[];
  closingDate: string;
  notes: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRfqInput = {
  projectId: string;
  siteId?: string | null;
  purchaseRequestId: string;
  title: string;
  vendorIds: string[];
  closingDate: string;
  notes?: string | null;
};

export type UpdateRfqInput = Partial<CreateRfqInput>;

export type ListRfqsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  purchaseRequestId?: string;
  status?: RfqStatus;
  search?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedRfqs = {
  items: PublicRfq[];
  meta: PaginationMeta | null;
};

/** Subset of vendor quotation returned by `GET /rfqs/:id/responses`. */
export type RfqQuotationResponse = {
  id: string;
  quotationNumber?: string;
  vendorId: string;
  status: string;
  rfqId?: string | null;
  purchaseRequestId?: string;
  grandTotal?: number;
  createdAt?: string;
};
