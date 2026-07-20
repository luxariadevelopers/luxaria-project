import type { WorkflowTimelineEvent } from '@luxaria/shared-types';
import { unitStatusLabel } from './labels';
import type { LinkedBooking, PublicUnit } from './types';

function event(partial: {
  id: string;
  action: string;
  actionLabel: string;
  at: string | null;
  comment?: string | null;
  from?: string | null;
  to?: string | null;
}): WorkflowTimelineEvent {
  return {
    id: partial.id,
    kind: 'status',
    source: 'provided',
    action: partial.action,
    actionLabel: partial.actionLabel,
    at: partial.at,
    actor: {
      id: null,
      displayName: 'System',
    },
    comment: partial.comment ?? null,
    documents: [],
    statusTransition:
      partial.from != null || partial.to != null
        ? { from: partial.from ?? null, to: partial.to ?? null }
        : null,
    stepNumber: null,
    metadata: null,
  };
}

/**
 * Client status history from unit + linked booking fields.
 * Nest has no dedicated unit status-history endpoint.
 */
export function buildUnitStatusHistory(
  unit: PublicUnit,
  bookings: readonly LinkedBooking[],
): WorkflowTimelineEvent[] {
  const events: WorkflowTimelineEvent[] = [];

  events.push(
    event({
      id: `${unit.id}-created`,
      action: 'created',
      actionLabel: 'Unit created',
      at: unit.createdAt ?? null,
      to: unitStatusLabel('available'),
      comment: `${unit.block}-${unit.unitNumber}`,
    }),
  );

  // Prefer booking lifecycle markers when present.
  const sorted = [...bookings].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return ta - tb;
  });

  for (const booking of sorted) {
    events.push(
      event({
        id: `${booking.id}-linked`,
        action: 'booking_linked',
        actionLabel: `Booking ${booking.bookingNumber}`,
        at: booking.createdAt ?? booking.bookingDate,
        to: booking.status,
        comment: `Agreed ${booking.approvedPrice}`,
      }),
    );

    if (booking.holdExpiresAt) {
      events.push(
        event({
          id: `${booking.id}-hold`,
          action: 'hold',
          actionLabel: 'Hold expiry set',
          at: booking.holdExpiresAt,
          comment: booking.bookingNumber,
        }),
      );
    }

    if (booking.expiredAt) {
      events.push(
        event({
          id: `${booking.id}-expired`,
          action: 'expired',
          actionLabel: 'Booking expired',
          at: booking.expiredAt,
          from: booking.status,
          to: 'expired',
        }),
      );
    }

    if (booking.cancelledAt) {
      events.push(
        event({
          id: `${booking.id}-cancelled`,
          action: 'cancelled',
          actionLabel: 'Booking cancelled',
          at: booking.cancelledAt,
          to: 'cancelled',
          comment: booking.cancellationReason,
        }),
      );
    }
  }

  if (unit.updatedAt && unit.updatedAt !== unit.createdAt) {
    events.push(
      event({
        id: `${unit.id}-current`,
        action: 'current_status',
        actionLabel: `Current: ${unitStatusLabel(unit.status)}`,
        at: unit.updatedAt,
        to: unitStatusLabel(unit.status),
        comment: unit.bookingRefId
          ? `Booking ref ${unit.bookingRefId}`
          : unit.notes,
      }),
    );
  }

  return events.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });
}
