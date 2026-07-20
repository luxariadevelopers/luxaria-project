import { bookingStatusCatalog } from '@/status';
import { BookingFundingType } from './types';

export function bookingStatusLabel(status: string): string {
  return bookingStatusCatalog.label(status);
}

export function fundingTypeLabel(type: string): string {
  switch (type) {
    case BookingFundingType.OwnFunds:
      return 'Own funds';
    case BookingFundingType.BankLoan:
      return 'Bank loan';
    case BookingFundingType.Mixed:
      return 'Mixed';
    default:
      return type || '—';
  }
}

export const BOOKING_STATUS_FILTER_OPTIONS: readonly {
  value: string;
  label: string;
}[] = [
  { value: '', label: 'All statuses' },
  { value: 'hold', label: 'Hold' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'booked', label: 'Booked' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'registered', label: 'Registered' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];
