import {
  PettyCashExpenseCategory,
  PettyCashRequirementStatus,
} from './types';

export function pettyCashRequestStatusLabel(status: string): string {
  switch (status) {
    case PettyCashRequirementStatus.Draft:
      return 'Draft';
    case PettyCashRequirementStatus.Submitted:
      return 'Submitted';
    case PettyCashRequirementStatus.ProjectManagerReview:
      return 'PM review';
    case PettyCashRequirementStatus.FinanceReview:
      return 'Finance review';
    case PettyCashRequirementStatus.Approved:
      return 'Approved';
    case PettyCashRequirementStatus.Funded:
      return 'Funded';
    case PettyCashRequirementStatus.Closed:
      return 'Closed';
    case PettyCashRequirementStatus.Rejected:
      return 'Rejected';
    case PettyCashRequirementStatus.Returned:
      return 'Returned';
    case PettyCashRequirementStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

/** Alias used by list filters (Phase 048). */
export const requirementStatusLabel = pettyCashRequestStatusLabel;

export function expenseCategoryLabel(category: string): string {
  switch (category) {
    case PettyCashExpenseCategory.Travel:
      return 'Travel';
    case PettyCashExpenseCategory.Transport:
      return 'Transport';
    case PettyCashExpenseCategory.Food:
      return 'Food';
    case PettyCashExpenseCategory.Materials:
      return 'Materials';
    case PettyCashExpenseCategory.Labour:
      return 'Labour';
    case PettyCashExpenseCategory.Tools:
      return 'Tools';
    case PettyCashExpenseCategory.Utilities:
      return 'Utilities';
    case PettyCashExpenseCategory.SiteMisc:
      return 'Site misc';
    case PettyCashExpenseCategory.Other:
      return 'Other';
    default:
      return category;
  }
}

export const EXPENSE_CATEGORY_OPTIONS = Object.values(
  PettyCashExpenseCategory,
).map((value) => ({
  value,
  label: expenseCategoryLabel(value),
}));
