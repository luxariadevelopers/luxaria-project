import { CashAccountKind, CashAccountStatus } from './types';

const STATUS_LABELS: Record<string, string> = {
  [CashAccountStatus.Active]: 'Active',
  [CashAccountStatus.PendingHandover]: 'Pending handover',
  [CashAccountStatus.Closed]: 'Closed',
};

export function cashAccountStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function cashAccountKindLabel(kind: string): string {
  if (kind === CashAccountKind.SiteCash) return 'Site cash';
  if (kind === CashAccountKind.PettyCash) return 'Petty cash';
  return kind.replace(/_/g, ' ');
}

export const CASH_ACCOUNT_KIND_OPTIONS = [
  { value: CashAccountKind.SiteCash, label: 'Site cash' },
  { value: CashAccountKind.PettyCash, label: 'Petty cash' },
] as const;

export const CASH_ACCOUNT_STATUS_OPTIONS = [
  { value: CashAccountStatus.Active, label: 'Active' },
  { value: CashAccountStatus.PendingHandover, label: 'Pending handover' },
  { value: CashAccountStatus.Closed, label: 'Closed' },
] as const;
