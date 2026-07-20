import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChartOfAccountsService } from './chart-of-accounts.service';

@Injectable()
export class ChartOfAccountsSeedService implements OnModuleInit {
  private readonly logger = new Logger(ChartOfAccountsSeedService.name);

  constructor(private readonly chartOfAccountsService: ChartOfAccountsService) {}

  async onModuleInit(): Promise<void> {
    try {
      const result = await this.chartOfAccountsService.seedStandard();
      this.logger.log(
        `COA seed: created=${result.data?.created ?? 0} skipped=${result.data?.skipped ?? 0}`,
      );
    } catch (error) {
      this.logger.error(
        `COA seed failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
