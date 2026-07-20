import { maskSecret } from '../logging/log-redaction';

export type AlertConfig = {
  deliveryFailureThreshold24h: number;
  databaseDownAlertEnabled: boolean;
  redisDownAlertEnabled: boolean;
  errorTrackingEnabled: boolean;
  errorTrackingDsn: string | null;
  opsAlertWebhookConfigured: boolean;
  opsAlertWebhookMasked: string | null;
};

export type AlertConfigView = {
  deliveryFailureThreshold24h: number;
  databaseDownAlertEnabled: boolean;
  redisDownAlertEnabled: boolean;
  errorTrackingEnabled: boolean;
  errorTrackingDsnMasked: string | null;
  opsAlertWebhookConfigured: boolean;
  opsAlertWebhookMasked: string | null;
};

export function parseAlertConfig(env: NodeJS.ProcessEnv = process.env): AlertConfig {
  return {
    deliveryFailureThreshold24h: Number(
      env.ALERT_DELIVERY_FAILURE_THRESHOLD_24H ?? 10,
    ),
    databaseDownAlertEnabled:
      String(env.ALERT_DATABASE_DOWN_ENABLED ?? 'true').toLowerCase() !==
      'false',
    redisDownAlertEnabled:
      String(env.ALERT_REDIS_DOWN_ENABLED ?? 'true').toLowerCase() !== 'false',
    errorTrackingEnabled:
      String(env.ERROR_TRACKING_ENABLED ?? 'false').toLowerCase() === 'true',
    errorTrackingDsn: env.ERROR_TRACKING_DSN?.trim() || null,
    opsAlertWebhookConfigured: Boolean(env.OPS_ALERT_WEBHOOK_URL?.trim()),
    opsAlertWebhookMasked: maskSecret(env.OPS_ALERT_WEBHOOK_URL),
  };
}

export function toAlertConfigView(config: AlertConfig): AlertConfigView {
  return {
    deliveryFailureThreshold24h: config.deliveryFailureThreshold24h,
    databaseDownAlertEnabled: config.databaseDownAlertEnabled,
    redisDownAlertEnabled: config.redisDownAlertEnabled,
    errorTrackingEnabled: config.errorTrackingEnabled,
    errorTrackingDsnMasked: maskSecret(config.errorTrackingDsn ?? undefined),
    opsAlertWebhookConfigured: config.opsAlertWebhookConfigured,
    opsAlertWebhookMasked: config.opsAlertWebhookMasked,
  };
}

export function isErrorTrackingActive(config: AlertConfig): boolean {
  return config.errorTrackingEnabled && Boolean(config.errorTrackingDsn);
}
