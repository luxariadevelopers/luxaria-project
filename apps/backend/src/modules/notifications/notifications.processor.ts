import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  NOTIFICATION_JOB_DELIVER,
  NOTIFICATION_JOB_PROCESS_SCHEDULED,
  NOTIFICATIONS_QUEUE,
} from './notifications.constants';
import type { DeliverJobData } from './notifications.dispatcher';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NotificationsService } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly dispatcher: NotificationsDispatcher,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(
    job: Job<DeliverJobData | Record<string, never>>,
  ): Promise<unknown> {
    if (job.name === NOTIFICATION_JOB_PROCESS_SCHEDULED) {
      this.logger.log(`Processing scheduled notifications job ${job.id}`);
      return this.notificationsService.processDueScheduled();
    }

    if (job.name !== NOTIFICATION_JOB_DELIVER) {
      this.logger.warn(`Ignoring unknown job name: ${job.name}`);
      return { skipped: true };
    }

    const data = job.data as DeliverJobData;
    this.logger.log(
      `Delivering notification ${data.notificationId} channel=${data.channel} attempt=${job.attemptsMade + 1}`,
    );

    return this.dispatcher.deliver({
      ...data,
      attempt: job.attemptsMade + 1,
    });
  }
}
