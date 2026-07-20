import type { ExpenseCategoryStatus } from './types';

export function expenseCategoryStatusLabel(
  status: ExpenseCategoryStatus,
): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatApprovalLimit(limit: number | null): string {
  if (limit === null || limit === undefined) return 'Not set';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(limit);
}

export function evidenceSummary(category: {
  requiresBill: boolean;
  requiresSignature: boolean;
  requiresPhoto: boolean;
}): string {
  const parts: string[] = [];
  if (category.requiresBill) parts.push('Bill');
  if (category.requiresSignature) parts.push('Signature');
  if (category.requiresPhoto) parts.push('Photo');
  return parts.length ? parts.join(' · ') : 'None';
}
