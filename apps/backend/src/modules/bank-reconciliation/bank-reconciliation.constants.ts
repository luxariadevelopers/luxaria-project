export enum BankReconciliationSessionStatus {
  Draft = 'draft',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum BankStatementLineStatus {
  Unmatched = 'unmatched',
  Matched = 'matched',
  Excluded = 'excluded',
}

export enum BankReconciliationMatchType {
  Auto = 'auto',
  Manual = 'manual',
}

export enum BankReconciliationMatchStatus {
  Active = 'active',
  Undone = 'undone',
}

export enum BankReconciliationMatchCriterion {
  Amount = 'amount',
  Date = 'date',
  TransactionId = 'transaction_id',
  ChequeNumber = 'cheque_number',
  Composite = 'composite',
}

export enum BankReconciliationAdjustmentType {
  BankCharges = 'bank_charges',
  InterestIncome = 'interest_income',
  InterestExpense = 'interest_expense',
}

/** Default date tolerance (days) for amount+date auto-match. */
export const BANK_RECON_DATE_TOLERANCE_DAYS = 3;

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
