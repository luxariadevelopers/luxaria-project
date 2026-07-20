import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import type { HealthPayload } from './health.service';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { getHealth: jest.Mock; getOperationsHealth: jest.Mock };

  const healthPayload: HealthPayload = {
    status: 'ok',
    service: 'backend',
    environment: 'test',
    version: '0.1.0',
    timestamp: '2026-07-17T04:30:00.000Z',
    uptimeSeconds: 12,
    alerts: [],
    checks: {
      database: {
        status: 'up',
        readyState: 1,
        readyStateLabel: 'connected',
        host: '127.0.0.1',
        name: 'luxaria-erp-test',
        maskedUri: 'mongodb://***:***@127.0.0.1:9017/luxaria-erp-test',
      },
      redis: {
        enabled: false,
        status: 'disabled',
        host: null,
        port: null,
        latencyMs: null,
      },
      memory: {
        heapUsedMb: 42.1,
        heapTotalMb: 64,
        rssMb: 88.2,
      },
      notifications: {
        windowHours: 24,
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        retrying: 0,
        threshold24h: 10,
        thresholdExceeded: false,
      },
    },
  };

  beforeEach(async () => {
    healthService = {
      getHealth: jest.fn().mockResolvedValue(healthPayload),
      getOperationsHealth: jest.fn().mockResolvedValue({
        ...healthPayload,
        alertConfig: {
          deliveryFailureThreshold24h: 10,
          databaseDownAlertEnabled: true,
          redisDownAlertEnabled: true,
          errorTrackingEnabled: false,
          errorTrackingDsnMasked: null,
          opsAlertWebhookConfigured: false,
          opsAlertWebhookMasked: null,
        },
        errorTracking: { enabled: false, active: false },
        backgroundJobs: {
          redisQueueMode: false,
          stockReorderJobsEnabled: true,
          dprMissingJobsEnabled: true,
          paymentScheduleOverdueJobsEnabled: true,
          directorDigestJobsEnabled: true,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns a standard success response with health data', async () => {
    const response = await controller.getHealth();

    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      success: true,
      message: 'Health check successful',
      data: healthPayload,
      meta: {},
    });
  });

  it('includes database connection health in health data', async () => {
    const response = await controller.getHealth();
    expect(response.data?.checks.database.status).toBe('up');
    expect(response.data?.checks.database.readyState).toBe(1);
    expect(response.data?.checks.database.readyStateLabel).toBe('connected');
    expect(response.data?.checks.database.maskedUri).not.toContain('secret');
  });

  it('returns operations health for audit viewers', async () => {
    const response = await controller.getOperationsHealth();
    expect(healthService.getOperationsHealth).toHaveBeenCalledTimes(1);
    expect(response.data?.alertConfig.deliveryFailureThreshold24h).toBe(10);
  });
});
