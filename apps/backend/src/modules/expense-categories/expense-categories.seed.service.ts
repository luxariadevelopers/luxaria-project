import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ExpenseCategoriesService } from './expense-categories.service';

@Injectable()
export class ExpenseCategoriesSeedService implements OnModuleInit {
  private readonly logger = new Logger(ExpenseCategoriesSeedService.name);

  constructor(private readonly service: ExpenseCategoriesService) {}

  async onModuleInit() {
    try {
      const result = await this.service.seedStandard();
      if ((result.data?.created ?? 0) > 0) {
        this.logger.log(
          `Seeded ${result.data?.created} standard expense categories`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Expense category seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
