import { getQueueToken } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import type { AppConfig } from '../../config/configuration';
import {
  NOTIFICATION_JOB_PROCESS_SCHEDULED,
  NOTIFICATIONS_QUEUE,
} from './notifications.constants';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly notificationsService: NotificationsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** Every minute: process due scheduled notifications. */
  @Cron(process.env.NOTIFICATIONS_SCHEDULE_CRON ?? '* * * * *', {
    name: 'notifications-process-scheduled',
  })
  async handleScheduledCron(): Promise<void> {
    this.logger.debug('Scheduled notification sweep starting');
    await this.enqueueOrProcessScheduled();
  }

  async enqueueOrProcessScheduled() {
    const redisEnabled = this.configService.get('redisEnabled', {
      infer: true,
    });
    const queue = redisEnabled ? this.tryGetQueue() : undefined;

    if (queue) {
      const job = await queue.add(
        NOTIFICATION_JOB_PROCESS_SCHEDULED,
        {},
        {
          removeOnComplete: 20,
          removeOnFail: 50,
          attempts: 2,
          backoff: { type: 'fixed', delay: 2_000 },
        },
      );
      this.logger.log(`Enqueued scheduled-notification sweep ${job.id}`);
      return { mode: 'queued' as const, jobId: String(job.id) };
    }

    const result = await this.notificationsService.processDueScheduled();
    return { mode: 'inline' as const, ...result };
  }

  private tryGetQueue(): Queue | undefined {
    try {
      return this.moduleRef.get<Queue>(getQueueToken(NOTIFICATIONS_QUEUE), {
        strict: false,
      });
    } catch {
      return undefined;
    }
  }
}
