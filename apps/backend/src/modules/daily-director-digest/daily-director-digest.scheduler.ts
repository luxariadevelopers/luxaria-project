import { getQueueToken } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import type { AppConfig } from '../../config/configuration';
import {
  DIRECTOR_DIGEST_JOB_RUN,
  DIRECTOR_DIGEST_QUEUE,
} from './daily-director-digest.constants';
import type { DirectorDigestJobData } from './daily-director-digest.processor';
import { DailyDirectorDigestService } from './daily-director-digest.service';
import type { SendDigestDto } from './dto/digest.dto';

@Injectable()
export class DailyDirectorDigestScheduler {
  private readonly logger = new Logger(DailyDirectorDigestScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly digestService: DailyDirectorDigestService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** Morning cron — expression from DIRECTOR_DIGEST_CRON (default 08:00). */
  @Cron(process.env.DIRECTOR_DIGEST_CRON ?? '0 8 * * *', {
    name: 'director-digest-run',
  })
  async handleCron(): Promise<void> {
    if (!this.configService.get('directorDigestJobsEnabled', { infer: true })) {
      return;
    }

    this.logger.log('Scheduled daily director digest starting');
    await this.enqueueOrRun({});
  }

  async enqueueOrRun(data: SendDigestDto = {}) {
    const redisEnabled = this.configService.get('redisEnabled', {
      infer: true,
    });
    const queue = redisEnabled ? this.tryGetQueue() : undefined;

    if (queue) {
      const job = await queue.add(
        DIRECTOR_DIGEST_JOB_RUN,
        data as DirectorDigestJobData,
        {
          removeOnComplete: 30,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      );
      this.logger.log(`Enqueued director digest job ${job.id}`);
      return {
        mode: 'queued' as const,
        jobId: String(job.id),
      };
    }

    const result = await this.digestService.runScheduled(data);
    return {
      mode: 'inline' as const,
      jobId: 'inline',
      result: result.data,
    };
  }

  private tryGetQueue(): Queue<DirectorDigestJobData> | undefined {
    try {
      return this.moduleRef.get<Queue<DirectorDigestJobData>>(
        getQueueToken(DIRECTOR_DIGEST_QUEUE),
        { strict: false },
      );
    } catch {
      return undefined;
    }
  }
}
