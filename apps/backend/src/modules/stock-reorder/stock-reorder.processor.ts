import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  STOCK_REORDER_JOB_EVALUATE,
  STOCK_REORDER_QUEUE,
} from './stock-reorder.constants';
import { StockReorderService } from './stock-reorder.service';

export type StockReorderEvaluateJobData = {
  projectId?: string;
  materialId?: string;
  lookbackDays?: number;
  asOf?: string;
};

@Processor(STOCK_REORDER_QUEUE)
export class StockReorderProcessor extends WorkerHost {
  private readonly logger = new Logger(StockReorderProcessor.name);

  constructor(private readonly stockReorderService: StockReorderService) {
    super();
  }

  async process(job: Job<StockReorderEvaluateJobData>): Promise<unknown> {
    if (job.name !== STOCK_REORDER_JOB_EVALUATE) {
      this.logger.warn(`Ignoring unknown job name: ${job.name}`);
      return { skipped: true };
    }

    this.logger.log(`Processing stock reorder job ${job.id}`);
    const result = await this.stockReorderService.evaluate(
      {
        projectId: job.data.projectId,
        materialId: job.data.materialId,
        lookbackDays: job.data.lookbackDays,
        asOf: job.data.asOf,
      },
      String(job.id),
    );
    return result.data;
  }
}
