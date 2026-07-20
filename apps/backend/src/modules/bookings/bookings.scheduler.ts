import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly bookingsService: BookingsService,
  ) {}

  /**
   * Hold expiry cron (BOOKING_HOLD_EXPIRY_CRON, default every 15 minutes).
   */
  @Cron(process.env.BOOKING_HOLD_EXPIRY_CRON ?? '*/15 * * * *', {
    name: 'booking-hold-expiry',
  })
  async handleCron(): Promise<void> {
    if (
      !this.configService.get('bookingHoldExpiryJobsEnabled', { infer: true })
    ) {
      return;
    }
    this.logger.log('Scheduled booking hold expiry starting');
    const result = await this.bookingsService.expireHolds();
    this.logger.log(
      `Booking hold expiry done: expired=${result.data?.expired ?? 0}`,
    );
  }
}
