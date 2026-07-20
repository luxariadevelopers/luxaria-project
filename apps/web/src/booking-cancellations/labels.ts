import type { BookingCancellationStatus } from './types';

const STATUS_LABELS: Record<BookingCancellationStatus, string> = {
  requested: 'Requested',
  reviewed: 'Reviewed',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  refund_processed: 'Refund processed',
  unit_released: 'Unit released',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function cancellationStatusLabel(status: string): string {
  return STATUS_LABELS[status as BookingCancellationStatus] ?? status;
}
