import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AccountingPeriod,
  AccountingPeriodSchema,
} from '../accounting-period-closure/schemas/accounting-period.schema';
import { CompanyModule } from '../company/company.module';
import { FinancialYearController } from './financial-year.controller';
import { FinancialYearSeedService } from './financial-year.seed.service';
import { FinancialYearService } from './financial-year.service';
import {
  FinancialYearUnlockRequest,
  FinancialYearUnlockRequestSchema,
} from './schemas/financial-year-unlock-request.schema';
import { FinancialYear, FinancialYearSchema } from './schemas/financial-year.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FinancialYear.name, schema: FinancialYearSchema },
      { name: FinancialYearUnlockRequest.name, schema: FinancialYearUnlockRequestSchema },
      { name: AccountingPeriod.name, schema: AccountingPeriodSchema },
    ]),
    CompanyModule,
  ],
  controllers: [FinancialYearController],
  providers: [FinancialYearService, FinancialYearSeedService],
  exports: [FinancialYearService, MongooseModule],
})
export class FinancialYearModule {}
