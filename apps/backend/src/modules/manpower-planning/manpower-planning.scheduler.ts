import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import { createSystemContext } from '../project-access/system-execution-context';
import { ManpowerPlanningService } from './manpower-planning.service';

@Injectable()
export class ManpowerPlanningScheduler {
  private readonly logger = new Logger(ManpowerPlanningScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly manpowerService: ManpowerPlanningService,
  ) {}

  /**
   * Evening cron (MANPOWER_SHORTFALL_CRON, default 21:00) —
   * evaluate shortfall vs plan/attendance after site day closes.
   */
  @Cron(process.env.MANPOWER_SHORTFALL_CRON ?? '0 21 * * *', {
    name: 'manpower-shortfall-evaluate',
  })
  async handleCron(): Promise<void> {
    if (
      !this.configService.get('manpowerShortfallJobsEnabled', {
        infer: true,
      })
    ) {
      return;
    }
    const system = createSystemContext({
      jobName: 'manpower-shortfall-evaluate',
      reason:
        'Evaluate manpower shortfall alerts; iterates all active projects/companies explicitly in service',
    });
    this.logger.log(
      `Scheduled manpower shortfall evaluation starting system=${system.jobName}`,
    );
    const result = await this.manpowerService.evaluateShortfallAlerts();
    this.logger.log(
      `Manpower shortfall evaluation done: created=${result.data?.created ?? 0} updated=${result.data?.updated ?? 0}`,
    );
  }
}
