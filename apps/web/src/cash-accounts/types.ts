/**
 * Mirrors `apps/backend/src/modules/cash-accounts` public shapes.
 * Permissions are Nest `cash.view` / `cash.manage` (not `cash_account.*`).
 */

export const CashAccountKind = {
  SiteCash: 'site_cash',
  PettyCash: 'petty_cash',
} as const;

export type CashAccountKind =
  (typeof CashAccountKind)[keyof typeof CashAccountKind];

export const CashAccountStatus = {
  Active: 'active',
  PendingHandover: 'pending_handover',
  Closed: 'closed',
} as const;

export type CashAccountStatus =
  (typeof CashAccountStatus)[keyof typeof CashAccountStatus];

export type PublicCustodianHandover = {
  fromUserId: string;
  toUserId: string;
  initiatedBy: string;
  initiatedAt: string;
  outgoingConfirmedAt: string | null;
  outgoingConfirmedBy: string | null;
  incomingConfirmedAt: string | null;
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
  closedAt: string | null;
  closedBy: string | null;
  closeReason: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  asOf: string;
};

export type ListCashAccountsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  kind?: CashAccountKind;
  status?: CashAccountStatus;
  custodianUserId?: string;
};

export type PaginatedCashAccounts = {
  items: PublicCashAccount[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type CreateCashAccountInput = {
  accountName: string;
  kind: CashAccountKind;
  projectId: string;
  custodianUserId: string;
  ledgerAccountId: string;
  maximumHoldingLimit: number;
  replenishmentLevel: number;
  openingBalance?: number;
};

export type InitiateCustodianTransferInput = {
  toUserId: string;
  declaredBalance?: number;
  notes?: string;
};

export type ConfirmHandoverInput = {
  notes?: string;
};

export type CloseCashAccountInput = {
  reason?: string;
};
