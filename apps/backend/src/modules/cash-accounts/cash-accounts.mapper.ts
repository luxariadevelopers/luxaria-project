import type { Types } from 'mongoose';
import type {
  CashAccountKind,
  CashAccountStatus,
  CustodianHandover,
} from './schemas/cash-account.schema';

export type PublicCustodianHandover = {
  fromUserId: string;
  toUserId: string;
  initiatedBy: string;
  initiatedAt: Date;
  outgoingConfirmedAt: Date | null;
  outgoingConfirmedBy: string | null;
  incomingConfirmedAt: Date | null;
  incomingConfirmedBy: string | null;
  declaredBalance: number | null;
  notes: string | null;
  awaitingOutgoingConfirmation: boolean;
  awaitingIncomingConfirmation: boolean;
};

export type PublicCashAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  kind: CashAccountKind;
  projectId: string;
  custodianUserId: string;
  ledgerAccountId: string;
  maximumHoldingLimit: number;
  replenishmentLevel: number;
  openingBalance: number;
  status: CashAccountStatus;
  pendingHandover: PublicCustodianHandover | null;
  closedAt: Date | null;
  closedBy: string | null;
  closeReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CashBalanceView = {
  cashAccountId: string;
  accountCode: string;
  ledgerAccountId: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  maximumHoldingLimit: number;
  replenishmentLevel: number;
  needsReplenishment: boolean;
  isOverLimit: boolean;
  isNegative: boolean;
  asOf: Date;
};

export type CashLedgerLine = {
  journalId: string;
  journalNumber: string;
  journalDate: Date;
  narration: string;
  lineId: string;
  debit: number;
  credit: number;
  description: string | null;
  runningBalance: number;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicHandover(
  h: CustodianHandover | null | undefined,
): PublicCustodianHandover | null {
  if (!h) return null;
  return {
    fromUserId: String(h.fromUserId),
    toUserId: String(h.toUserId),
    initiatedBy: String(h.initiatedBy),
    initiatedAt: h.initiatedAt,
    outgoingConfirmedAt: h.outgoingConfirmedAt ?? null,
    outgoingConfirmedBy: oid(h.outgoingConfirmedBy),
    incomingConfirmedAt: h.incomingConfirmedAt ?? null,
    incomingConfirmedBy: oid(h.incomingConfirmedBy),
    declaredBalance: h.declaredBalance ?? null,
    notes: h.notes ?? null,
    awaitingOutgoingConfirmation: !h.outgoingConfirmedAt,
    awaitingIncomingConfirmation: !h.incomingConfirmedAt,
  };
}

export function toPublicCashAccount(row: {
  _id: Types.ObjectId | string;
  accountCode: string;
  accountName: string;
  kind: CashAccountKind;
  projectId: Types.ObjectId | string;
  custodianUserId: Types.ObjectId | string;
  ledgerAccountId: Types.ObjectId | string;
  maximumHoldingLimit: number;
  replenishmentLevel: number;
  openingBalance: number;
  status: CashAccountStatus;
  pendingHandover?: CustodianHandover | null;
  closedAt?: Date | null;
  closedBy?: Types.ObjectId | string | null;
  closeReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicCashAccount {
  return {
    id: String(row._id),
    accountCode: row.accountCode,
    accountName: row.accountName,
    kind: row.kind,
    projectId: String(row.projectId),
    custodianUserId: String(row.custodianUserId),
    ledgerAccountId: String(row.ledgerAccountId),
    maximumHoldingLimit: row.maximumHoldingLimit,
    replenishmentLevel: row.replenishmentLevel,
    openingBalance: row.openingBalance,
    status: row.status,
    pendingHandover: toPublicHandover(row.pendingHandover),
    closedAt: row.closedAt ?? null,
    closedBy: oid(row.closedBy),
    closeReason: row.closeReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
