import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import type { HealthPayload } from './health.service';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { getHealth: jest.Mock };

  const healthPayload: HealthPayload = {
    status: 'ok',
    service: 'backend',
    environment: 'test',
    timestamp: '2026-07-17T04:30:00.000Z',
    uptimeSeconds: 12,
    database: {
      status: 'up',
      readyState: 1,
      readyStateLabel: 'connected',
      host: '127.0.0.1',
      name: 'luxaria-erp-test',
      maskedUri: 'mongodb://***:***@127.0.0.1:9017/luxaria-erp-test',
    },
  };

  beforeEach(async () => {
    healthService = {
      getHealth: jest.fn().mockReturnValue(healthPayload),
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

  it('returns a standard success response with health data', () => {
    const response = controller.getHealth();

    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      success: true,
      message: 'Health check successful',
      data: healthPayload,
      meta: {},
    });
  });

  it('includes database connection health in health data', () => {
    const response = controller.getHealth();
    expect(response.data?.database.status).toBe('up');
    expect(response.data?.database.readyState).toBe(1);
    expect(response.data?.database.readyStateLabel).toBe('connected');
    expect(response.data?.database.maskedUri).not.toContain('secret');
  });
});
