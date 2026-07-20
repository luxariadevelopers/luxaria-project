import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  DIRECTOR_DIGEST_JOB_RUN,
  DIRECTOR_DIGEST_QUEUE,
} from './daily-director-digest.constants';
import { DailyDirectorDigestService } from './daily-director-digest.service';
import type { SendDigestDto } from './dto/digest.dto';

export type DirectorDigestJobData = SendDigestDto;

@Processor(DIRECTOR_DIGEST_QUEUE)
export class DailyDirectorDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyDirectorDigestProcessor.name);

  constructor(private readonly digestService: DailyDirectorDigestService) {
    super();
  }

  async process(job: Job<DirectorDigestJobData>): Promise<unknown> {
    if (job.name !== DIRECTOR_DIGEST_JOB_RUN) {
      this.logger.warn(`Ignoring unknown job ${job.name}`);
      return { ignored: true };
    }

    this.logger.log(`Processing director digest job ${job.id}`);
    const result = await this.digestService.runScheduled(job.data ?? {});
    return result.data;
  }
}
