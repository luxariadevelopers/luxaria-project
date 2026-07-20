import { formatDateTime } from '@/format';
import { BookingStatus } from './types';

export type HoldExpiryTone = 'none' | 'active' | 'lapsed' | 'expired' | 'invalid';

export type HoldExpiryDisplay = {
  /** Short cell label. */
  label: string;
  tone: HoldExpiryTone;
  /** Accessible / test detail. */
  detail: string;
};

function parseInstant(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Surface hold expiry / invalid states for the bookings table.
 *
 * - `expired` status → terminal expired hold
 * - `hold` / `pending_approval` past `holdExpiresAt` → lapsed (job not yet applied)
 * - hold without `holdExpiresAt` → invalid
 */
export function describeHoldExpiry(input: {
  status: string;
  holdExpiresAt: string | null;
  expiredAt?: string | null;
  now?: Date;
}): HoldExpiryDisplay {
  const now = input.now ?? new Date();
  const status = input.status;

  if (status === BookingStatus.Expired) {
    const when = parseInstant(input.expiredAt ?? null);
    return {
      label: when ? `Expired ${formatDateTime(when.toISOString())}` : 'Expired',
      tone: 'expired',
      detail: 'Booking hold has expired',
    };
  }

  const holdLike =
    status === BookingStatus.Hold || status === BookingStatus.PendingApproval;

  if (!holdLike) {
    return { label: '—', tone: 'none', detail: 'No hold expiry' };
  }

  const expires = parseInstant(input.holdExpiresAt);
  if (!expires) {
    return {
      label: 'No expiry set',
      tone: 'invalid',
      detail: 'Hold is missing holdExpiresAt',
    };
  }

  if (expires.getTime() <= now.getTime()) {
    return {
      label: `Lapsed ${formatDateTime(expires.toISOString())}`,
      tone: 'lapsed',
      detail: 'Hold expiry passed; status still active until expire job runs',
    };
  }

  return {
    label: formatDateTime(expires.toISOString()),
    tone: 'active',
    detail: 'Hold expires at the displayed time',
  };
}

export function isExpiredOrLapsedHold(display: HoldExpiryDisplay): boolean {
  return display.tone === 'expired' || display.tone === 'lapsed';
}
