export const PettyCashExpenseCategory = {
  Travel: 'travel',
  Transport: 'transport',
  Food: 'food',
  Materials: 'materials',
  Labour: 'labour',
  Tools: 'tools',
  Utilities: 'utilities',
  SiteMisc: 'site_misc',
  Other: 'other',
} as const;

export type PettyCashExpenseCategory =
  (typeof PettyCashExpenseCategory)[keyof typeof PettyCashExpenseCategory];

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
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** `GET /cash-accounts/:id/balance` — `cash.view` */
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

export type PublicPettyCashRequirement = {
  id: string;
  /** Nest public field */
  requestNumber: string;
  /** Legacy alias used by older mobile screens */
  requirementNumber?: string;
  projectId: string;
  pettyCashAccountId: string;
  weekStartDate: string;
  weekEndDate: string;
  justification: string;
  status: string;
  totalEstimatedAmount?: number;
  previousUnsettledAmount?: number;
  currentCashBalance?: number;
  warnings?: string[];
};

export type CreatePettyCashInput = {
  projectId: string;
  pettyCashAccountId: string;
  weekStartDate: string;
  weekEndDate: string;
  justification: string;
  requirementItems: Array<{
    expenseCategory: PettyCashExpenseCategory;
    description: string;
    estimatedAmount: number;
  }>;
};

export function requestNumberOf(
  row: Pick<PublicPettyCashRequirement, 'requestNumber' | 'requirementNumber'>,
): string {
  return row.requestNumber || row.requirementNumber || '';
}
