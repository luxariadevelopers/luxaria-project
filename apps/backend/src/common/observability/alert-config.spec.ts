import {
  isErrorTrackingActive,
  parseAlertConfig,
  toAlertConfigView,
} from './alert-config';

describe('alert-config', () => {
  it('parses defaults when env vars are absent', () => {
    expect(parseAlertConfig({})).toEqual({
      deliveryFailureThreshold24h: 10,
      databaseDownAlertEnabled: true,
      redisDownAlertEnabled: true,
      errorTrackingEnabled: false,
      errorTrackingDsn: null,
      opsAlertWebhookConfigured: false,
      opsAlertWebhookMasked: null,
    });
  });

  it('parses explicit alert and tracking env vars', () => {
    const config = parseAlertConfig({
      ALERT_DELIVERY_FAILURE_THRESHOLD_24H: '25',
      ALERT_DATABASE_DOWN_ENABLED: 'false',
      ALERT_REDIS_DOWN_ENABLED: 'false',
      ERROR_TRACKING_ENABLED: 'true',
      ERROR_TRACKING_DSN: 'https://errors.example.com/project/abc123',
      OPS_ALERT_WEBHOOK_URL: 'https://hooks.example.com/secret-webhook-token',
    });

    expect(config.deliveryFailureThreshold24h).toBe(25);
    expect(config.databaseDownAlertEnabled).toBe(false);
    expect(config.redisDownAlertEnabled).toBe(false);
    expect(isErrorTrackingActive(config)).toBe(true);
    expect(config.opsAlertWebhookConfigured).toBe(true);
  });

  it('masks secrets in the public view', () => {
    const view = toAlertConfigView(
      parseAlertConfig({
        ERROR_TRACKING_ENABLED: 'true',
        ERROR_TRACKING_DSN: 'https://errors.example.com/project/abc123',
        OPS_ALERT_WEBHOOK_URL: 'https://hooks.example.com/secret-webhook-token',
      }),
    );

    expect(view.errorTrackingDsnMasked).toContain('[REDACTED]');
    expect(view.errorTrackingDsnMasked).not.toContain('abc123');
    expect(view.opsAlertWebhookMasked).toContain('[REDACTED]');
    expect(view.opsAlertWebhookMasked).not.toContain('secret-webhook-token');
  });
});
