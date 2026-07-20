import {
  BankReconciliationAdjustmentType,
  BankReconciliationMatchStatus,
  BankReconciliationMatchType,
  BankReconciliationSessionStatus,
  BankStatementLineStatus,
} from './types';

export const SESSION_STATUS_OPTIONS = [
  { value: BankReconciliationSessionStatus.Draft, label: 'Draft' },
  { value: BankReconciliationSessionStatus.InProgress, label: 'In progress' },
  { value: BankReconciliationSessionStatus.Completed, label: 'Completed' },
  { value: BankReconciliationSessionStatus.Cancelled, label: 'Cancelled' },
] as const;

export function sessionStatusLabel(status: string): string {
  return (
    SESSION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

export function statementLineStatusLabel(status: string): string {
  switch (status) {
    case BankStatementLineStatus.Unmatched:
      return 'Unmatched';
    case BankStatementLineStatus.Matched:
      return 'Matched';
    case BankStatementLineStatus.Excluded:
      return 'Excluded';
    default:
      return status;
  }
}

export function matchTypeLabel(type: string): string {
  switch (type) {
    case BankReconciliationMatchType.Auto:
      return 'Auto';
    case BankReconciliationMatchType.Manual:
      return 'Manual';
    default:
      return type;
  }
}

export function matchStatusLabel(status: string): string {
  switch (status) {
    case BankReconciliationMatchStatus.Active:
      return 'Active';
    case BankReconciliationMatchStatus.Undone:
      return 'Undone';
    default:
      return status;
  }
}

export const ADJUSTMENT_TYPE_OPTIONS = [
  {
    value: BankReconciliationAdjustmentType.BankCharges,
    label: 'Bank charges',
  },
  {
    value: BankReconciliationAdjustmentType.InterestIncome,
    label: 'Interest income',
  },
  {
    value: BankReconciliationAdjustmentType.InterestExpense,
    label: 'Interest expense',
  },
] as const;

export function adjustmentTypeLabel(type: string): string {
  return (
    ADJUSTMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
  );
}

/** Column mapping field labels for the import wizard. */
export const COLUMN_MAPPING_FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'debit', label: 'Debit / Withdrawal', required: false },
  { key: 'credit', label: 'Credit / Deposit', required: false },
  { key: 'amount', label: 'Signed amount', required: false },
  { key: 'balance', label: 'Balance', required: false },
  { key: 'transactionId', label: 'Transaction / UTR', required: false },
  { key: 'chequeNumber', label: 'Cheque number', required: false },
] as const;
