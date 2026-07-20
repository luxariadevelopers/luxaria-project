import { getDomainStatusLabel } from '@/status';
import { JournalStatus } from './types';

export function journalStatusLabel(status: string): string {
  return getDomainStatusLabel('journal', status, status);
}

/** Known Nest `sourceModule` values used when posting journals. */
export const JOURNAL_SOURCE_MODULE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'journal', label: 'Journal (reversal)' },
  { value: 'vendor_invoice', label: 'Vendor invoice' },
  { value: 'vendor_payment', label: 'Vendor payment' },
  { value: 'contractor_payment', label: 'Contractor payment' },
  { value: 'customer_receipt', label: 'Customer receipt' },
  { value: 'site_expense', label: 'Site expense' },
  { value: 'signed_payment', label: 'Signed payment' },
  { value: 'petty_cash', label: 'Petty cash' },
  { value: 'bank_reconciliation', label: 'Bank reconciliation' },
  { value: 'booking_cancellation', label: 'Booking cancellation' },
  { value: 'stock_count', label: 'Stock count' },
] as const;

export function sourceModuleLabel(module: string | null | undefined): string {
  if (!module) return '—';
  const found = JOURNAL_SOURCE_MODULE_OPTIONS.find((o) => o.value === module);
  return found?.label ?? module.replace(/_/g, ' ');
}

export const JOURNAL_STATUS_OPTIONS = Object.values(JournalStatus);
