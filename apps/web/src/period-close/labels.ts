import {
  AccountingPeriodStatus,
  AccountingPeriodType,
  PeriodChecklistItemStatus,
  PeriodReopenRequestStatus,
} from './types';

export const PERIOD_TYPE_OPTIONS = [
  { value: AccountingPeriodType.Monthly, label: 'Monthly' },
  { value: AccountingPeriodType.FinancialYear, label: 'Financial year' },
] as const;

export const PERIOD_STATUS_OPTIONS = [
  { value: AccountingPeriodStatus.Open, label: 'Open' },
  { value: AccountingPeriodStatus.Locked, label: 'Locked' },
  { value: AccountingPeriodStatus.Closed, label: 'Closed' },
] as const;

export function periodTypeLabel(type: string): string {
  switch (type) {
    case AccountingPeriodType.Monthly:
      return 'Monthly';
    case AccountingPeriodType.FinancialYear:
      return 'Financial year';
    default:
      return type;
  }
}

export function periodStatusLabel(status: string): string {
  switch (status) {
    case AccountingPeriodStatus.Open:
      return 'Open';
    case AccountingPeriodStatus.Locked:
      return 'Locked';
    case AccountingPeriodStatus.Closed:
      return 'Closed';
    default:
      return status;
  }
}

export function checklistItemStatusLabel(status: string): string {
  switch (status) {
    case PeriodChecklistItemStatus.Pending:
      return 'Pending';
    case PeriodChecklistItemStatus.Passed:
      return 'Passed';
    case PeriodChecklistItemStatus.Failed:
      return 'Failed';
    default:
      return status;
  }
}

export function reopenRequestStatusLabel(status: string): string {
  switch (status) {
    case PeriodReopenRequestStatus.Pending:
      return 'Pending';
    case PeriodReopenRequestStatus.Approved:
      return 'Approved';
    case PeriodReopenRequestStatus.Rejected:
      return 'Rejected';
    default:
      return status;
  }
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function periodDisplayLabel(period: {
  periodNumber: string;
  periodType: string;
  year: number | null;
  month: number | null;
}): string {
  if (
    period.periodType === AccountingPeriodType.Monthly &&
    period.month != null &&
    period.year != null
  ) {
    const name = MONTH_NAMES[period.month - 1] ?? `Month ${period.month}`;
    return `${name} ${period.year}`;
  }
  if (period.periodType === AccountingPeriodType.FinancialYear) {
    return `FY · ${period.periodNumber}`;
  }
  return period.periodNumber;
}
