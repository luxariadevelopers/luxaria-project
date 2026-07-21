import { normalizeLegacyTimelineEvents } from '@luxaria/shared-types';
import { BookingStatus } from '@/status';
import { bookingStatusLabel } from './labels';
import type { PublicBooking } from './types';

export function buildBookingTimeline(booking: PublicBooking) {
  const legacy = [];

  if (booking.createdAt) {
    legacy.push({
      id: 'created',
      action: 'created',
      at: booking.createdAt,
      comment: 'Booking created',
    });
  }

  if (booking.status === BookingStatus.PendingApproval) {
    legacy.push({
      id: 'pending_approval',
      action: 'pending_approval',
      toStatus: BookingStatus.PendingApproval,
      comment: booking.discountApprovalRequired
        ? 'Over-limit discount awaits booking.approve'
        : 'Awaiting discount approval',
    });
  }

  if (booking.discountApproved && booking.status !== BookingStatus.Cancelled) {
    legacy.push({
      id: 'discount_approved',
      action: 'discount_approved',
      comment: 'Discount approved',
    });
  }

  if (booking.holdExpiresAt && booking.status === BookingStatus.Hold) {
    legacy.push({
      id: 'hold',
      action: 'hold',
      toStatus: BookingStatus.Hold,
      at: booking.holdExpiresAt,
      comment: 'Hold expiry scheduled',
    });
  }

  const workflowStatuses = [
    BookingStatus.Reserved,
    BookingStatus.Booked,
    BookingStatus.Agreement,
    BookingStatus.Registered,
  ] as const;

  const statusIndex = workflowStatuses.indexOf(
    booking.status as (typeof workflowStatuses)[number],
  );

  workflowStatuses.forEach((status, index) => {
    if (statusIndex >= index) {
      legacy.push({
        id: status,
        action: status,
        toStatus: status,
        comment:
          booking.status === status
            ? 'Current status'
            : bookingStatusLabel(status),
      });
    }
  });

  if (booking.expiredAt) {
    legacy.push({
      id: 'expired',
      action: 'expired',
      at: booking.expiredAt,
      toStatus: BookingStatus.Expired,
    });
  }

  if (booking.cancelledAt) {
    legacy.push({
      id: 'cancelled',
      action: 'cancelled',
      at: booking.cancelledAt,
      toStatus: BookingStatus.Cancelled,
      comment: booking.cancellationReason ?? undefined,
    });
  }

  if (booking.pdfGeneratedAt) {
    legacy.push({
      id: 'pdf',
      action: 'pdf_generated',
      at: booking.pdfGeneratedAt,
      comment: 'Booking form PDF generated',
    });
  }

  return normalizeLegacyTimelineEvents(legacy);
}
