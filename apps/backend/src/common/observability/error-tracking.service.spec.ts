import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ErrorTrackingService } from './error-tracking.service';

describe('ErrorTrackingService', () => {
  let service: ErrorTrackingService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorTrackingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'errorTrackingEnabled') {
                return true;
              }
              if (key === 'errorTrackingDsn') {
                return 'https://errors.example.com/ingest';
              }
              if (key === 'opsAlertWebhookUrl') {
                return null;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ErrorTrackingService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports enabled when DSN and flag are set', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('posts redacted payloads when tracking is enabled', async () => {
    service.captureException(new Error('password=secret leaked'), {
      requestId: 'req-1',
      path: '/api/v1/users',
      method: 'POST',
      extra: { email: 'admin@luxaria.com', token: 'abc' },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      message: string;
      extra: { email: string; token: string };
    };
    expect(body.message).not.toContain('secret');
    expect(body.extra.email).toBe('[REDACTED]');
    expect(body.extra.token).toBe('[REDACTED]');
  });
});
