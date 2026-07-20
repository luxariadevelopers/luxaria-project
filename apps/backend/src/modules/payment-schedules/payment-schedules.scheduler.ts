import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import { PaymentSchedulesService } from './payment-schedules.service';

@Injectable()
export class PaymentSchedulesScheduler {
  private readonly logger = new Logger(PaymentSchedulesScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly paymentSchedulesService: PaymentSchedulesService,
  ) {}

  /**
   * Overdue cron (PAYMENT_SCHEDULE_OVERDUE_CRON, default daily 01:00).
   */
  @Cron(process.env.PAYMENT_SCHEDULE_OVERDUE_CRON ?? '0 1 * * *', {
    name: 'payment-schedule-mark-overdue',
  })
  async handleCron(): Promise<void> {
    if (
      !this.configService.get('paymentScheduleOverdueJobsEnabled', {
        infer: true,
      })
    ) {
      return;
    }
    this.logger.log('Scheduled payment-schedule overdue evaluation starting');
    const result = await this.paymentSchedulesService.markOverdue();
    this.logger.log(
      `Overdue evaluation done: marked=${result.data?.marked ?? 0}`,
    );
  }
}
