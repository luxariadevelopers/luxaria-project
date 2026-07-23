/** Mirrors Nest / `@luxaria/shared-types` journal statuses. */
export const JournalStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Posted: 'posted',
  Reversed: 'reversed',
  Cancelled: 'cancelled',
} as const;

export type JournalStatus =
  (typeof JournalStatus)[keyof typeof JournalStatus];

export type PublicJournalLine = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  projectId: string | null;
  blockId: string | null;
  costCentreId: string | null;
  boqItemId: string | null;
  partyType: string | null;
  partyId: string | null;
  fundingSource: string | null;
  description: string | null;
};

export type PublicJournalEntry = {
  id: string;
  journalNumber: string;
  journalDate: string;
  financialYearId: string;
  projectId: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  narration: string;
  status: JournalStatus | string;
  totalDebit: number;
  totalCredit: number;
  postedAt: string | null;
  postedBy: string | null;
  reversalOf: string | null;
  reversedBy: string | null;
  idempotencyKey: string | null;
  lines: PublicJournalLine[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListJournalsQuery = {
  page?: number;
  limit?: number;
  status?: string;
  projectId?: string;
  financialYearId?: string;
  from?: string;
  to?: string;
  sourceModule?: string;
};

export type PaginatedJournals = {
  items: PublicJournalEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export const JournalPartyType = {
  Vendor: 'vendor',
  Contractor: 'contractor',
  Customer: 'customer',
  Investor: 'investor',
  Director: 'director',
  Employee: 'employee',
  Other: 'other',
} as const;

export type JournalPartyType =
  (typeof JournalPartyType)[keyof typeof JournalPartyType];

export const JournalFundingSource = {
  ProjectFunds: 'project_funds',
  CompanyFunds: 'company_funds',
  Loan: 'loan',
  Investor: 'investor',
  Director: 'director',
  Other: 'other',
} as const;

export type JournalFundingSource =
  (typeof JournalFundingSource)[keyof typeof JournalFundingSource];

export type CreateJournalLineInput = {
  accountId: string;
  debit?: number;
  credit?: number;
  projectId?: string | null;
  blockId?: string | null;
  costCentreId?: string | null;
  boqItemId?: string | null;
  partyType?: JournalPartyType | null;
  partyId?: string | null;
  fundingSource?: JournalFundingSource | null;
  description?: string | null;
};

export type CreateJournalInput = {
  journalDate: string;
  narration: string;
  projectId?: string | null;
  sourceModule?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  lines: CreateJournalLineInput[];
  post?: boolean;
};

export type ReverseJournalInput = {
  journalDate?: string;
  narration?: string;
};

export type ReverseJournalResult = {
  original: PublicJournalEntry;
  reversal: PublicJournalEntry;
};
