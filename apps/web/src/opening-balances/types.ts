/** Mirrors Nest `apps/backend/src/modules/opening-balances`. */

export const OpeningBalancePackStatus = {
  Draft: 'draft',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type OpeningBalancePackStatus =
  (typeof OpeningBalancePackStatus)[keyof typeof OpeningBalancePackStatus];

export type PublicOpeningBalancePack = {
  id: string;
  packNumber: string;
  companyId: string;
  financialYearId: string;
  projectId: string | null;
  status: OpeningBalancePackStatus;
  totalDebit: number;
  totalCredit: number;
  journalEntryId: string | null;
  notes: string | null;
  postedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OpeningBalanceListRow = Pick<
  PublicOpeningBalancePack,
  | 'id'
  | 'packNumber'
  | 'financialYearId'
  | 'projectId'
  | 'status'
  | 'totalDebit'
  | 'totalCredit'
  | 'postedAt'
  | 'createdAt'
>;

export type ListOpeningBalancePacksQuery = {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  financialYearId?: string;
  projectId?: string;
  status?: OpeningBalancePackStatus;
};

export type PaginatedOpeningBalancePacks = {
  items: OpeningBalanceListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
