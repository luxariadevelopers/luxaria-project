import { getDomainStatusLabel } from '@/status';
import { ContractorBillStatus } from './types';

export function runningBillStatusLabel(status: string): string {
  return getDomainStatusLabel('contractorBill', status, status);
}

export function raNumberLabel(raNumber: number): string {
  return `RA-${raNumber}`;
}

export function formatBillingPeriod(from: string, to: string): string {
  const a = from.slice(0, 10);
  const b = to.slice(0, 10);
  if (!a && !b) return '—';
  if (a === b) return a;
  return `${a} → ${b}`;
}

/** Statuses shown in list / form filters. */
export const RUNNING_BILL_STATUS_FILTER_OPTIONS: readonly ContractorBillStatus[] =
  Object.values(ContractorBillStatus);
