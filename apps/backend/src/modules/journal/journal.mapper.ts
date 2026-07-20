import type { Types } from 'mongoose';
import type {
  JournalFundingSource,
  JournalPartyType,
  JournalStatus,
} from './schemas/journal-entry.schema';

export type PublicJournalLine = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  projectId: string | null;
  blockId: string | null;
  costCentreId: string | null;
  boqItemId: string | null;
  partyType: JournalPartyType | null;
  partyId: string | null;
  fundingSource: JournalFundingSource | null;
  description: string | null;
};

export type PublicJournalEntry = {
  id: string;
  journalNumber: string;
  journalDate: Date;
  financialYearId: string;
  projectId: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  postingPurpose: string | null;
  narration: string;
  status: JournalStatus;
  totalDebit: number;
  totalCredit: number;
  postedAt: Date | null;
  postedBy: string | null;
  reversalOf: string | null;
  reversedBy: string | null;
  idempotencyKey: string | null;
  lines: PublicJournalLine[];
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicJournal(row: {
  _id: Types.ObjectId | string;
  journalNumber: string;
  journalDate: Date;
  financialYearId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  sourceModule?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  postingPurpose?: string | null;
  narration: string;
  status: JournalStatus;
  totalDebit: number;
  totalCredit: number;
  postedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  reversalOf?: Types.ObjectId | string | null;
  reversedBy?: Types.ObjectId | string | null;
  idempotencyKey?: string | null;
  lines?: Array<{
    _id?: Types.ObjectId | string;
    accountId: Types.ObjectId | string;
    debit: number;
    credit: number;
    projectId?: Types.ObjectId | string | null;
    blockId?: Types.ObjectId | string | null;
    costCentreId?: Types.ObjectId | string | null;
    boqItemId?: Types.ObjectId | string | null;
    partyType?: JournalPartyType | null;
    partyId?: Types.ObjectId | string | null;
    fundingSource?: JournalFundingSource | null;
    description?: string | null;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicJournalEntry {
  return {
    id: String(row._id),
    journalNumber: row.journalNumber,
    journalDate: row.journalDate,
    financialYearId: String(row.financialYearId),
    projectId: oid(row.projectId),
    sourceModule: row.sourceModule ?? null,
    sourceEntityType: row.sourceEntityType ?? null,
    sourceEntityId: row.sourceEntityId ?? null,
    postingPurpose: row.postingPurpose ?? null,
    narration: row.narration,
    status: row.status,
    totalDebit: row.totalDebit,
    totalCredit: row.totalCredit,
    postedAt: row.postedAt ?? null,
    postedBy: oid(row.postedBy),
    reversalOf: oid(row.reversalOf),
    reversedBy: oid(row.reversedBy),
    idempotencyKey: row.idempotencyKey ?? null,
    lines: (row.lines ?? []).map((line) => ({
      id: line._id ? String(line._id) : '',
      accountId: String(line.accountId),
      debit: line.debit,
      credit: line.credit,
      projectId: oid(line.projectId),
      blockId: oid(line.blockId),
      costCentreId: oid(line.costCentreId),
      boqItemId: oid(line.boqItemId),
      partyType: line.partyType ?? null,
      partyId: oid(line.partyId),
      fundingSource: line.fundingSource ?? null,
      description: line.description ?? null,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
