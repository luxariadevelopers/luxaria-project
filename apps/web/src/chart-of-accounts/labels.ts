import { AccountCategory, AccountStatus, AccountType } from './types';

export function accountTypeLabel(type: string): string {
  switch (type) {
    case AccountType.Asset:
      return 'Asset';
    case AccountType.Liability:
      return 'Liability';
    case AccountType.Equity:
      return 'Equity';
    case AccountType.Income:
      return 'Income';
    case AccountType.Expense:
      return 'Expense';
    default:
      return type;
  }
}

export function accountCategoryLabel(category: string): string {
  return category.replace(/_/g, ' ');
}

export function accountStatusLabel(status: string): string {
  switch (status) {
    case AccountStatus.Active:
      return 'Active';
    case AccountStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export const ACCOUNT_TYPE_OPTIONS = Object.values(AccountType).map((value) => ({
  value,
  label: accountTypeLabel(value),
}));

export const ACCOUNT_CATEGORY_OPTIONS = Object.values(AccountCategory).map(
  (value) => ({
    value,
    label: accountCategoryLabel(value),
  }),
);
