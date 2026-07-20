import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import { createSystemContext } from '../project-access/system-execution-context';
import { ContractorAgreementsService } from './contractor-agreements.service';

@Injectable()
export class ContractorAgreementsScheduler {
  private readonly logger = new Logger(ContractorAgreementsScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly agreementsService: ContractorAgreementsService,
  ) {}

  /**
   * Morning cron (CONTRACTOR_AGREEMENT_EXPIRY_CRON, default 07:00) —
   * raise alerts for active agreements nearing / past endDate.
   */
  @Cron(process.env.CONTRACTOR_AGREEMENT_EXPIRY_CRON ?? '0 7 * * *', {
    name: 'contractor-agreement-expiry-evaluate',
  })
  async handleCron(): Promise<void> {
    if (
      !this.configService.get('contractorAgreementExpiryJobsEnabled', {
        infer: true,
      })
    ) {
      return;
    }
    const system = createSystemContext({
      jobName: 'contractor-agreement-expiry-evaluate',
      reason:
        'Raise contractor agreement expiry alerts; iterates all active projects/companies explicitly in service',
    });
    this.logger.log(
      `Scheduled contractor-agreement expiry evaluation starting system=${system.jobName}`,
    );
    const result = await this.agreementsService.evaluateExpiryAlerts();
    this.logger.log(
      `Agreement expiry evaluation done: created=${result.data?.created ?? 0} expiredMarked=${result.data?.expiredMarked ?? 0}`,
    );
  }
}
