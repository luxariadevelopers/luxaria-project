import { describe, expect, it } from 'vitest';
import { NotificationEventType } from './eventTypes';
import { getDisplaySeverity } from './severity';

describe('notification display severity', () => {
  it('maps overdue / overrun events to critical', () => {
    expect(getDisplaySeverity(NotificationEventType.PaymentOverdue)).toBe(
      'critical',
    );
    expect(getDisplaySeverity(NotificationEventType.BudgetOverrun)).toBe(
      'critical',
    );
  });

  it('maps operational alerts to warning', () => {
    expect(getDisplaySeverity(NotificationEventType.MissingDpr)).toBe(
      'warning',
    );
    expect(getDisplaySeverity(NotificationEventType.LowStock)).toBe(
      'warning',
    );
  });

  it('defaults unknown / digest events to info', () => {
    expect(
      getDisplaySeverity(NotificationEventType.DirectorDailyDigest),
    ).toBe('info');
    expect(getDisplaySeverity('custom_future_event')).toBe('info');
  });
});
