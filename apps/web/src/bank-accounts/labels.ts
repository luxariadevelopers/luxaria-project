import { BankAccountStatus, BankAccountType } from './types';

export const BANK_ACCOUNT_STATUS_OPTIONS = Object.values(BankAccountStatus);

export const BANK_ACCOUNT_TYPE_OPTIONS = Object.values(BankAccountType);

export function bankAccountStatusLabel(status: string): string {
  switch (status) {
    case BankAccountStatus.Active:
      return 'Active';
    case BankAccountStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export function bankAccountTypeLabel(type: string): string {
  switch (type) {
    case BankAccountType.Current:
      return 'Current';
    case BankAccountType.Savings:
      return 'Savings';
    case BankAccountType.Overdraft:
      return 'Overdraft';
    case BankAccountType.CashCredit:
      return 'Cash credit';
    case BankAccountType.Escrow:
      return 'Escrow';
    case BankAccountType.Other:
      return 'Other';
    default:
      return type;
  }
}
