/**
 * Mirrors `PublicJournalEntry` from
 * `apps/backend/src/modules/journal/journal.mapper.ts`.
 */

import { JournalStatus } from '@/status';

export { JournalStatus };
export type { JournalStatus as JournalStatusType } from '@/status';

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
  status: JournalStatus;
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
  status?: JournalStatus;
  projectId?: string;
  financialYearId?: string;
  from?: string;
  to?: string;
  sourceModule?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedJournals = {
  items: PublicJournalEntry[];
  meta: PaginationMeta;
};

/** Nest `JournalPartyType` */
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

/** Nest `JournalFundingSource` */
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

/** Nest `CreateJournalDto` / `JournalLineDto` (manual journals). */
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
  /** When true, Nest posts immediately — needs `journal.post`; Phase 044 leaves false. */
  post?: boolean;
};

export type UpdateJournalInput = Partial<
  Pick<CreateJournalInput, 'journalDate' | 'projectId' | 'narration' | 'lines'>
>;

/** Nest `ReverseJournalDto` */
export type ReverseJournalInput = {
  journalDate?: string;
  narration?: string;
};

/** Nest `CancelJournalDto` */
export type CancelJournalInput = {
  reason?: string;
};

/** Nest reverse response `{ original, reversal }` */
export type ReverseJournalResult = {
  original: PublicJournalEntry;
  reversal: PublicJournalEntry;
};
