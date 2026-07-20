import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { StockReorderScheduler } from './stock-reorder.scheduler';
import type { StockReorderService } from './stock-reorder.service';

describe('StockReorderScheduler', () => {
  it('runs evaluation inline when Redis is disabled', async () => {
    const evaluate = jest.fn().mockResolvedValue({
      data: { forecastCount: 2, alertCount: 1 },
    });
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'redisEnabled') return false;
        if (key === 'stockReorderJobsEnabled') return true;
        return undefined;
      }),
    } as unknown as ConfigService<never, true>;

    const scheduler = new StockReorderScheduler(
      configService,
      { evaluate } as unknown as StockReorderService,
      { get: jest.fn() } as unknown as ModuleRef,
    );

    const outcome = await scheduler.enqueueOrRun({ projectId: 'abc' });
    expect(outcome.mode).toBe('inline');
    expect(evaluate).toHaveBeenCalledWith({ projectId: 'abc' }, 'inline');
  });

  it('enqueues BullMQ job when Redis queue is available', async () => {
    const add = jest.fn().mockResolvedValue({ id: '42' });
    const evaluate = jest.fn();
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'redisEnabled') return true;
        if (key === 'stockReorderJobsEnabled') return true;
        return undefined;
      }),
    } as unknown as ConfigService<never, true>;

    const scheduler = new StockReorderScheduler(
      configService,
      { evaluate } as unknown as StockReorderService,
      {
        get: jest.fn().mockReturnValue({ add }),
      } as unknown as ModuleRef,
    );

    const outcome = await scheduler.enqueueOrRun({});
    expect(outcome.mode).toBe('queued');
    expect(outcome.jobId).toBe('42');
    expect(add).toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('skips cron when jobs are disabled', async () => {
    const evaluate = jest.fn();
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'stockReorderJobsEnabled') return false;
        return undefined;
      }),
    } as unknown as ConfigService<never, true>;

    const scheduler = new StockReorderScheduler(
      configService,
      { evaluate } as unknown as StockReorderService,
      { get: jest.fn() } as unknown as ModuleRef,
    );

    await scheduler.handleCron();
    expect(evaluate).not.toHaveBeenCalled();
  });
});
