import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { Company } from '../company/schemas/company.schema';
import { FinancialYear, FinancialYearStatus } from './schemas/financial-year.schema';

@Injectable()
export class FinancialYearSeedService implements OnModuleInit {
  private readonly logger = new Logger(FinancialYearSeedService.name);

  constructor(
    @InjectModel(FinancialYear.name)
    private readonly financialYearModel: Model<FinancialYear>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedCurrentYearIfMissing();
  }

  /**
   * Seeds an open current FY for the primary company when none exist.
   * Uses company.financialYearStartMonth (default April).
   */
  async seedCurrentYearIfMissing(): Promise<{ created: boolean }> {
    const existingCount = await this.financialYearModel.countDocuments({}).exec();
    if (existingCount > 0) {
      this.logger.log('Financial year seed skipped (years already present)');
      return { created: false };
    }

    const company = await this.companyModel.findOne({ isPrimary: true }).lean().exec();
    const startMonth = company?.financialYearStartMonth ?? 4;
    const companyId = company?._id ? (company._id as Types.ObjectId) : null;

    const { name, startDate, endDate } = this.buildYearWindow(new Date(), startMonth);

    await this.financialYearModel.create({
      companyId,
      name,
      startDate,
      endDate,
      status: FinancialYearStatus.Open,
      isCurrent: true,
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
    });

    this.logger.log(`Seeded current financial year ${name}`);
    return { created: true };
  }

  private buildYearWindow(reference: Date, startMonth: number) {
    const year = reference.getUTCFullYear();
    const month = reference.getUTCMonth() + 1;

    const startYear = month >= startMonth ? year : year - 1;
    const endYear = startYear + 1;

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(endYear, startMonth - 1, 0, 23, 59, 59, 999));
    const name = `FY ${startYear}-${String(endYear).slice(-2)}`;

    return { name, startDate, endDate };
  }
}
