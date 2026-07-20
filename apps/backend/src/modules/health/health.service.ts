import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import {
  parseAlertConfig,
  toAlertConfigView,
  type AlertConfigView,
} from '../../common/observability/alert-config';
import { ErrorTrackingService } from '../../common/observability/error-tracking.service';
import {
  probeRedisHealth,
  readRedisConfig,
  type RedisHealth,
} from '../../common/observability/redis-health.util';
import type { DatabaseHealth } from '../../database/services/database.service';
import { DatabaseService } from '../../database/services/database.service';
import { NotificationDeliveryStatus } from '../notifications/notifications.constants';
import { NotificationDeliveryLog } from '../notifications/schemas/notification-delivery-log.schema';

export type MemoryHealth = {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
};

export type DeliveryHealthSummary = {
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

export type HealthChecks = {
  database: DatabaseHealth;
  redis: RedisHealth;
  memory: MemoryHealth;
  notifications: DeliveryHealthSummary;
};

export type HealthPayload = {
  status: 'ok' | 'degraded';
  service: 'backend';
  environment: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: HealthChecks;
  alerts: string[];
};

export type OperationsHealthPayload = HealthPayload & {
  alertConfig: AlertConfigView;
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

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly errorTracking: ErrorTrackingService,
    @InjectModel(NotificationDeliveryLog.name)
    private readonly deliveryLogModel: Model<NotificationDeliveryLog>,
  ) {}

  async getHealth(): Promise<HealthPayload> {
    const checks = await this.collectChecks();
    const alerts = this.buildAlerts(checks);

    return {
      status: alerts.length > 0 ? 'degraded' : 'ok',
      service: 'backend',
      environment: this.configService.getOrThrow<AppConfig['nodeEnv']>('nodeEnv'),
      version: this.configService.getOrThrow<AppConfig['appVersion']>('appVersion'),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks,
      alerts,
    };
  }

  async getOperationsHealth(): Promise<OperationsHealthPayload> {
    const base = await this.getHealth();
    const alertConfig = parseAlertConfig({
      ...process.env,
      ALERT_DELIVERY_FAILURE_THRESHOLD_24H: String(
        this.configService.getOrThrow<AppConfig['alertDeliveryFailureThreshold24h']>(
          'alertDeliveryFailureThreshold24h',
        ),
      ),
      ALERT_DATABASE_DOWN_ENABLED: String(
        this.configService.getOrThrow<AppConfig['alertDatabaseDownEnabled']>(
          'alertDatabaseDownEnabled',
        ),
      ),
      ALERT_REDIS_DOWN_ENABLED: String(
        this.configService.getOrThrow<AppConfig['alertRedisDownEnabled']>(
          'alertRedisDownEnabled',
        ),
      ),
      ERROR_TRACKING_ENABLED: String(
        this.configService.getOrThrow<AppConfig['errorTrackingEnabled']>(
          'errorTrackingEnabled',
        ),
      ),
      ERROR_TRACKING_DSN:
        this.configService.get<AppConfig['errorTrackingDsn']>('errorTrackingDsn') ??
        undefined,
      OPS_ALERT_WEBHOOK_URL:
        this.configService.get<AppConfig['opsAlertWebhookUrl']>('opsAlertWebhookUrl') ??
        undefined,
    });

    return {
      ...base,
      alertConfig: toAlertConfigView(alertConfig),
      errorTracking: {
        enabled: alertConfig.errorTrackingEnabled,
        active: this.errorTracking.isEnabled(),
      },
      backgroundJobs: {
        redisQueueMode: this.configService.getOrThrow<AppConfig['redisEnabled']>(
          'redisEnabled',
        ),
        stockReorderJobsEnabled: this.configService.getOrThrow<
          AppConfig['stockReorderJobsEnabled']
        >('stockReorderJobsEnabled'),
        dprMissingJobsEnabled: this.configService.getOrThrow<
          AppConfig['dprMissingJobsEnabled']
        >('dprMissingJobsEnabled'),
        paymentScheduleOverdueJobsEnabled: this.configService.getOrThrow<
          AppConfig['paymentScheduleOverdueJobsEnabled']
        >('paymentScheduleOverdueJobsEnabled'),
        directorDigestJobsEnabled: this.configService.getOrThrow<
          AppConfig['directorDigestJobsEnabled']
        >('directorDigestJobsEnabled'),
      },
    };
  }

  private async collectChecks(): Promise<HealthChecks> {
    const [redis, notifications] = await Promise.all([
      probeRedisHealth(readRedisConfig(this.configService)),
      this.getDeliverySummary(),
    ]);

    return {
      database: this.databaseService.getHealth(),
      redis,
      memory: this.getMemoryHealth(),
      notifications,
    };
  }

  private getMemoryHealth(): MemoryHealth {
    const usage = process.memoryUsage();
    const toMb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

    return {
      heapUsedMb: toMb(usage.heapUsed),
      heapTotalMb: toMb(usage.heapTotal),
      rssMb: toMb(usage.rss),
    };
  }

  private async getDeliverySummary(): Promise<DeliveryHealthSummary> {
    const windowHours = 24;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const threshold24h = this.configService.getOrThrow<
      AppConfig['alertDeliveryFailureThreshold24h']
    >('alertDeliveryFailureThreshold24h');

    const rows = await this.deliveryLogModel
      .aggregate<{ _id: NotificationDeliveryStatus; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();

    const counts = Object.fromEntries(
      rows.map((row) => [row._id, row.count]),
    ) as Partial<Record<NotificationDeliveryStatus, number>>;

    const sent = counts[NotificationDeliveryStatus.Sent] ?? 0;
    const failed = counts[NotificationDeliveryStatus.Failed] ?? 0;
    const pending = counts[NotificationDeliveryStatus.Pending] ?? 0;
    const skipped = counts[NotificationDeliveryStatus.Skipped] ?? 0;
    const retrying = counts[NotificationDeliveryStatus.Retrying] ?? 0;
    const total = sent + failed + pending + skipped + retrying;

    return {
      windowHours,
      total,
      sent,
      failed,
      pending,
      skipped,
      retrying,
      threshold24h,
      thresholdExceeded: failed >= threshold24h,
    };
  }

  private buildAlerts(checks: HealthChecks): string[] {
    const alerts: string[] = [];
    const alertConfig = parseAlertConfig({
      ALERT_DELIVERY_FAILURE_THRESHOLD_24H: String(
        this.configService.getOrThrow<AppConfig['alertDeliveryFailureThreshold24h']>(
          'alertDeliveryFailureThreshold24h',
        ),
      ),
      ALERT_DATABASE_DOWN_ENABLED: String(
        this.configService.getOrThrow<AppConfig['alertDatabaseDownEnabled']>(
          'alertDatabaseDownEnabled',
        ),
      ),
      ALERT_REDIS_DOWN_ENABLED: String(
        this.configService.getOrThrow<AppConfig['alertRedisDownEnabled']>(
          'alertRedisDownEnabled',
        ),
      ),
    });

    if (
      alertConfig.databaseDownAlertEnabled &&
      checks.database.status === 'down'
    ) {
      alerts.push('database_down');
    }

    if (
      alertConfig.redisDownAlertEnabled &&
      checks.redis.enabled &&
      checks.redis.status === 'down'
    ) {
      alerts.push('redis_down');
    }

    if (checks.notifications.thresholdExceeded) {
      alerts.push('notification_delivery_failures_high');
    }

    return alerts;
  }
}
