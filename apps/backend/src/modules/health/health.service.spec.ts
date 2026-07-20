import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ErrorTrackingService } from '../../common/observability/error-tracking.service';
import { DatabaseService } from '../../database/services/database.service';
import { NotificationDeliveryStatus } from '../notifications/notifications.constants';
import { NotificationDeliveryLog } from '../notifications/schemas/notification-delivery-log.schema';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  const deliveryLogModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: NotificationDeliveryStatus.Sent, count: 4 },
        { _id: NotificationDeliveryStatus.Failed, count: 12 },
      ]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, unknown> = {
                nodeEnv: 'test',
                appVersion: '0.1.0',
                alertDeliveryFailureThreshold24h: 10,
                alertDatabaseDownEnabled: true,
                alertRedisDownEnabled: true,
                errorTrackingEnabled: false,
                errorTrackingDsn: null,
                opsAlertWebhookUrl: null,
                redisEnabled: false,
                redisHost: '127.0.0.1',
                redisPort: 9018,
                redisPassword: '',
                stockReorderJobsEnabled: true,
                dprMissingJobsEnabled: true,
                paymentScheduleOverdueJobsEnabled: true,
                directorDigestJobsEnabled: true,
              };
              return values[key];
            }),
            get: jest.fn((_key: string) => null),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            getHealth: jest.fn().mockReturnValue({
              status: 'up',
              readyState: 1,
              readyStateLabel: 'connected',
              host: '127.0.0.1',
              name: 'luxaria-erp-test',
              maskedUri: 'mongodb://127.0.0.1:9017/luxaria-erp-test',
            }),
          },
        },
        {
          provide: ErrorTrackingService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: getModelToken(NotificationDeliveryLog.name),
          useValue: deliveryLogModel,
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('marks health degraded when delivery failures exceed threshold', async () => {
    const health = await service.getHealth();

    expect(health.status).toBe('degraded');
    expect(health.alerts).toContain('notification_delivery_failures_high');
    expect(health.checks.notifications.failed).toBe(12);
    expect(health.checks.notifications.thresholdExceeded).toBe(true);
  });

  it('returns masked alert config in operations health', async () => {
    const operations = await service.getOperationsHealth();

    expect(operations.alertConfig.deliveryFailureThreshold24h).toBe(10);
    expect(operations.errorTracking.enabled).toBe(false);
    expect(operations.backgroundJobs.redisQueueMode).toBe(false);
  });
});
