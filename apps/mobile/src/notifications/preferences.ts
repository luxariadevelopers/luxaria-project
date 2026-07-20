/** Mirrors backend NotificationEventType values used for preference toggles. */
export const NOTIFICATION_EVENT_TYPES = [
  'approval_pending',
  'approval_rejected',
  'payment_due',
  'payment_overdue',
  'low_stock',
  'stock_out_forecast',
  'material_variance',
  'labour_shortfall',
  'contractor_agreement_expiry',
  'missing_dpr',
  'petty_cash_settlement_delay',
  'customer_payment_overdue',
  'investor_contribution_overdue',
  'budget_overrun',
  'director_daily_digest',
] as const;

export type NotificationEventTypeValue =
  (typeof NOTIFICATION_EVENT_TYPES)[number];

export function humanizeEventType(eventType: string): string {
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildPushPreferencePatch(
  enabled: boolean,
  existingEvents: Array<{
    eventType: string;
    enabled: boolean;
    channels?: Array<{ channel: string; enabled: boolean }>;
  }> = [],
) {
  return NOTIFICATION_EVENT_TYPES.map((eventType) => {
    const existing = existingEvents.find((row) => row.eventType === eventType);
    const channels = [
      ...(existing?.channels ?? []).filter((row) => row.channel !== 'push'),
      { channel: 'push' as const, enabled },
    ] as Array<{ channel: 'in_app' | 'push' | 'email' | 'whatsapp'; enabled: boolean }>;
    return {
      eventType,
      enabled: existing?.enabled ?? true,
      channels,
    };
  });
}

export function isPushEnabledForUser(
  events: Array<{
    eventType: string;
    enabled: boolean;
    channels?: Array<{ channel: string; enabled: boolean }>;
  }> = [],
): boolean {
  if (!events.length) {
    return true;
  }
  return events.some((event) => {
    const push = event.channels?.find((row) => row.channel === 'push');
    return push ? push.enabled !== false : true;
  });
}
