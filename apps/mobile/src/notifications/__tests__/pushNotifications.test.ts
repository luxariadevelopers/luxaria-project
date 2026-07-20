import {
  buildPushPreferencePatch,
  humanizeEventType,
  isPushEnabledForUser,
} from '../preferences';
import { resolveNotificationRoute } from '../notificationNavigation';

describe('notification preferences helpers', () => {
  it('builds push channel patch for all events', () => {
    const events = buildPushPreferencePatch(false, [
      {
        eventType: 'payment_due',
        enabled: true,
        channels: [
          { channel: 'in_app', enabled: true },
          { channel: 'push', enabled: true },
        ],
      },
    ]);

    expect(events.length).toBeGreaterThan(10);
    expect(events.every((row) => row.channels?.some((c) => c.channel === 'push'))).toBe(
      true,
    );
    const paymentDue = events.find((row) => row.eventType === 'payment_due');
    expect(paymentDue?.channels?.find((c) => c.channel === 'push')?.enabled).toBe(
      false,
    );
  });

  it('detects push opt-out from stored events', () => {
    expect(
      isPushEnabledForUser([
        {
          eventType: 'low_stock',
          enabled: true,
          channels: [{ channel: 'push', enabled: false }],
        },
      ]),
    ).toBe(false);
  });

  it('humanizes event labels', () => {
    expect(humanizeEventType('missing_dpr')).toBe('Missing Dpr');
  });
});

describe('notificationNavigation', () => {
  it('routes goods receipt notifications', () => {
    expect(
      resolveNotificationRoute({ entityType: 'goods_receipt', entityId: '1' }),
    ).toEqual({ screen: 'GoodsReceipt' });
  });

  it('routes missing DPR notifications', () => {
    expect(resolveNotificationRoute({ eventType: 'missing_dpr' })).toEqual({
      screen: 'DailyProgressReport',
    });
  });

  it('defaults to tabs', () => {
    expect(resolveNotificationRoute({ eventType: 'payment_due' })).toEqual({
      screen: 'Tabs',
    });
  });
});
