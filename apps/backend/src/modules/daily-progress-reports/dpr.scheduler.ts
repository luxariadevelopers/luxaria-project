import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import { DprService } from './dpr.service';

@Injectable()
export class DprScheduler {
  private readonly logger = new Logger(DprScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly dprService: DprService,
  ) {}

  /**
   * Evening cron (DPR_MISSING_CRON, default 20:00) — raise alerts for
   * construction projects without a submitted/reviewed DPR for today.
   */
  @Cron(process.env.DPR_MISSING_CRON ?? '0 20 * * *', {
    name: 'dpr-missing-evaluate',
  })
  async handleCron(): Promise<void> {
    if (!this.configService.get('dprMissingJobsEnabled', { infer: true })) {
      return;
    }
    this.logger.log('Scheduled missing-DPR evaluation starting');
    const result = await this.dprService.evaluateMissingAlerts();
    this.logger.log(
      `Missing-DPR evaluation done: created=${result.data?.created ?? 0}`,
    );
  }
}
