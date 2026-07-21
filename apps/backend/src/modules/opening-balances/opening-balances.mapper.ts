import type { Types } from 'mongoose';
import type { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import type {
  OpeningBalanceLine,
  OpeningBalancePackStatus,
} from './schemas/opening-balance-pack.schema';

export type PublicOpeningBalanceLine = {
  accountId: string;
  debit: number;
  credit: number;
  costCentreId: string | null;
  partyType: JournalPartyType | null;
  partyId: string | null;
  description: string | null;
};

export type PublicOpeningBalancePack = {
  id: string;
  packNumber: string;
  companyId: string;
  financialYearId: string;
  projectId: string | null;
  status: OpeningBalancePackStatus;
  lines: PublicOpeningBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  journalEntryId: string | null;
  notes: string | null;
  postedBy: string | null;
  postedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicOpeningBalanceLine(
  line: OpeningBalanceLine,
): PublicOpeningBalanceLine {
  return {
    accountId: String(line.accountId),
    debit: line.debit,
    credit: line.credit,
    costCentreId: oid(line.costCentreId),
    partyType: line.partyType ?? null,
    partyId: oid(line.partyId),
    description: line.description ?? null,
  };
}

export function toPublicOpeningBalancePack(row: {
  _id: Types.ObjectId | string;
  packNumber: string;
  companyId: Types.ObjectId | string;
  financialYearId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  status: OpeningBalancePackStatus;
  lines: OpeningBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  journalEntryId?: Types.ObjectId | string | null;
  notes?: string | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicOpeningBalancePack {
  return {
    id: String(row._id),
    packNumber: row.packNumber,
    companyId: String(row.companyId),
    financialYearId: String(row.financialYearId),
    projectId: oid(row.projectId),
    status: row.status,
    lines: (row.lines ?? []).map(toPublicOpeningBalanceLine),
    totalDebit: row.totalDebit,
    totalCredit: row.totalCredit,
    journalEntryId: oid(row.journalEntryId),
    notes: row.notes ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
