import { getQueueToken } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import type { AppConfig } from '../../config/configuration';
import { createSystemContext } from '../project-access/system-execution-context';
import {
  STOCK_REORDER_JOB_EVALUATE,
  STOCK_REORDER_QUEUE,
} from './stock-reorder.constants';
import type { StockReorderEvaluateJobData } from './stock-reorder.processor';
import { StockReorderService } from './stock-reorder.service';

@Injectable()
export class StockReorderScheduler {
  private readonly logger = new Logger(StockReorderScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly stockReorderService: StockReorderService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Daily cron (expression from STOCK_REORDER_CRON).
   * Enqueues BullMQ job when Redis is enabled; otherwise runs inline.
   */
  @Cron(process.env.STOCK_REORDER_CRON ?? '0 6 * * *', {
    name: 'stock-reorder-evaluate',
  })
  async handleCron(): Promise<void> {
    if (!this.configService.get('stockReorderJobsEnabled', { infer: true })) {
      return;
    }

    const system = createSystemContext({
      jobName: 'stock-reorder-evaluate',
      reason:
        'Evaluate stock reorder thresholds; iterates all active projects/companies explicitly in service',
    });
    this.logger.log(
      `Scheduled stock reorder evaluation starting system=${system.jobName}`,
    );
    await this.enqueueOrRun({});
  }

  async enqueueOrRun(data: StockReorderEvaluateJobData = {}) {
    const redisEnabled = this.configService.get('redisEnabled', {
      infer: true,
    });
    const queue = redisEnabled ? this.tryGetQueue() : undefined;

    if (queue) {
      const job = await queue.add(STOCK_REORDER_JOB_EVALUATE, data, {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      });
      this.logger.log(`Enqueued stock reorder job ${job.id}`);
      return {
        mode: 'queued' as const,
        jobId: String(job.id),
      };
    }

    const result = await this.stockReorderService.evaluate(data, 'inline');
    return {
      mode: 'inline' as const,
      jobId: 'inline',
      result: result.data,
    };
  }

  private tryGetQueue(): Queue<StockReorderEvaluateJobData> | undefined {
    try {
      return this.moduleRef.get<Queue<StockReorderEvaluateJobData>>(
        getQueueToken(STOCK_REORDER_QUEUE),
        { strict: false },
      );
    } catch {
      return undefined;
    }
  }
}
