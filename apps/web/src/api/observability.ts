import { apiGet } from './client';

export type OperationsHealth = {
  status: 'ok' | 'degraded';
  service: 'backend';
  environment: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  alerts: string[];
  checks: {
    database: {
      status: 'up' | 'down';
      readyState: number;
      readyStateLabel: string;
      host: string;
      name: string;
      maskedUri: string;
    };
    redis: {
      enabled: boolean;
      status: 'up' | 'down' | 'disabled';
      host: string | null;
      port: number | null;
      latencyMs: number | null;
    };
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
    notifications: {
      windowHours: number;
      total: number;
      sent: number;
      failed: number;
      pending: number;
      skipped: number;
      retrying: number;
      threshold24h: number;
      thresholdExceeded: boolean;
    };
  };
  alertConfig: {
    deliveryFailureThreshold24h: number;
    databaseDownAlertEnabled: boolean;
    redisDownAlertEnabled: boolean;
    errorTrackingEnabled: boolean;
    errorTrackingDsnMasked: string | null;
    opsAlertWebhookConfigured: boolean;
    opsAlertWebhookMasked: string | null;
  };
  errorTracking: {
    enabled: boolean;
    active: boolean;
  };
  backgroundJobs: {
    redisQueueMode: boolean;
    stockReorderJobsEnabled: boolean;
    dprMissingJobsEnabled: boolean;
    paymentScheduleOverdueJobsEnabled: boolean;
    directorDigestJobsEnabled: boolean;
  };
};

export async function fetchOperationsHealth() {
  return apiGet<OperationsHealth>('/health/operations');
}
