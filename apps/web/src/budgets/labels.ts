import { BudgetStatus, type BudgetStatus as Status } from './types';

export function budgetStatusLabel(status: Status): string {
  switch (status) {
    case BudgetStatus.Draft:
      return 'Draft';
    case BudgetStatus.PendingApproval:
      return 'Pending approval';
    case BudgetStatus.Approved:
      return 'Approved';
    case BudgetStatus.Superseded:
      return 'Superseded';
    case BudgetStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}
