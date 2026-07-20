/**
 * Mirrors Nest public shapes from
 * `apps/backend/src/modules/bank-reconciliation`.
 */

export const BankReconciliationSessionStatus = {
  Draft: 'draft',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export type BankReconciliationSessionStatus =
  (typeof BankReconciliationSessionStatus)[keyof typeof BankReconciliationSessionStatus];

export const BankStatementLineStatus = {
  Unmatched: 'unmatched',
  Matched: 'matched',
  Excluded: 'excluded',
} as const;

export type BankStatementLineStatus =
  (typeof BankStatementLineStatus)[keyof typeof BankStatementLineStatus];

export const BankReconciliationMatchType = {
  Auto: 'auto',
  Manual: 'manual',
} as const;

export type BankReconciliationMatchType =
  (typeof BankReconciliationMatchType)[keyof typeof BankReconciliationMatchType];

export const BankReconciliationMatchStatus = {
  Active: 'active',
  Undone: 'undone',
} as const;

export type BankReconciliationMatchStatus =
  (typeof BankReconciliationMatchStatus)[keyof typeof BankReconciliationMatchStatus];

export const BankReconciliationMatchCriterion = {
  Amount: 'amount',
  Date: 'date',
  TransactionId: 'transaction_id',
  ChequeNumber: 'cheque_number',
  Composite: 'composite',
} as const;

export type BankReconciliationMatchCriterion =
  (typeof BankReconciliationMatchCriterion)[keyof typeof BankReconciliationMatchCriterion];

export const BankReconciliationAdjustmentType = {
  BankCharges: 'bank_charges',
  InterestIncome: 'interest_income',
  InterestExpense: 'interest_expense',
} as const;

export type BankReconciliationAdjustmentType =
  (typeof BankReconciliationAdjustmentType)[keyof typeof BankReconciliationAdjustmentType];

export type StatementColumnMapping = {
  date: string;
  description?: string;
  debit?: string;
  credit?: string;
  amount?: string;
  balance?: string;
  transactionId?: string;
  chequeNumber?: string;
};

export type DrillDownLink = {
  label: string;
  href: string;
};

export type PublicBankReconciliationSession = {
  id: string;
  sessionNumber: string;
  bankAccountId: string;
  ledgerAccountId: string;
  statementFrom: string;
  statementTo: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  columnMapping: StatementColumnMapping | null;
  sourceFileName: string | null;
  status: BankReconciliationSessionStatus;
  notes: string | null;
  completedAt: string | null;
  /** Present on `GET …/sessions/:id` summary. */
  lineCount?: number;
  unmatchedCount?: number;
  matchedCount?: number;
};

export type PublicBankStatementLine = {
  id: string;
  sessionId: string;
  lineNumber: number;
  txnDate: string;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  transactionId: string | null;
  chequeNumber: string | null;
  status: BankStatementLineStatus;
  matchId: string | null;
  drillDown: DrillDownLink[];
};

export type PublicBookLine = {
  journalId: string;
  journalLineId: string;
  journalNumber: string;
  journalDate: string;
  debit: number;
  credit: number;
  narration: string;
  lineDescription: string | null;
  sourceModule: string | null;
  sourceEntityId: string | null;
  drillDown?: DrillDownLink[];
};

export type PublicBankReconciliationMatch = {
  id: string;
  sessionId: string;
  statementLineIds: string[];
  bookLines: Array<{
    journalId: string;
    journalLineId: string;
    journalNumber: string;
    journalDate: string;
    debit: number;
    credit: number;
    narration: string;
    lineDescription: string | null;
    sourceModule: string | null;
    sourceEntityId: string | null;
  }>;
  matchType: BankReconciliationMatchType;
  criteria: BankReconciliationMatchCriterion[];
  status: BankReconciliationMatchStatus;
  matchedAt: string;
  undoneAt: string | null;
  notes: string | null;
};

export type UnmatchedPayload = {
  statementLines: PublicBankStatementLine[];
  bookLines: PublicBookLine[];
  statementUnmatchedCount: number;
  bookUnmatchedCount: number;
};

export type ImportStatementResult = {
  sessionId: string;
  importedCount: number;
  fileName: string | undefined;
};

export type AutoMatchResult = {
  sessionId: string;
  matchCount: number;
};

export type ReconciliationStatement = {
  session: PublicBankReconciliationSession;
  bankAccount: {
    id: string;
    accountCode: string;
    bankName: string;
  };
  bookBalanceAsOfStatementTo: number;
  statementClosingBalance: number;
  unmatchedStatementDeposits: number;
  unmatchedStatementWithdrawals: number;
  depositsInTransit: number;
  outstandingCheques: number;
  adjustedBookBalance: number;
  adjustedBankBalance: number;
  difference: number;
  reconciled: boolean;
  matchedCount: number;
  unmatchedStatementCount: number;
  unmatchedBookCount: number;
  unmatchedStatementLines: PublicBankStatementLine[];
  unmatchedBookLines: PublicBookLine[];
  matches: PublicBankReconciliationMatch[];
  drillDown: DrillDownLink[];
};

export type CreateReconciliationSessionInput = {
  bankAccountId: string;
  statementFrom: string;
  statementTo: string;
  statementOpeningBalance?: number;
  statementClosingBalance?: number;
  notes?: string;
};

export type ManualMatchInput = {
  statementLineIds: string[];
  bookLines: Array<{ journalId: string; journalLineId: string }>;
  notes?: string;
};

export type AutoMatchInput = {
  dateToleranceDays?: number;
};

export type PostAdjustmentInput = {
  adjustmentType: BankReconciliationAdjustmentType;
  journalDate: string;
  amount: number;
  narration: string;
  offsetAccountId?: string;
  statementLineId?: string;
};

export type ImportStatementInput = {
  file: File;
  columnMapping: StatementColumnMapping;
  replaceExisting?: boolean;
};

export type ListSessionsQuery = {
  bankAccountId?: string;
};
