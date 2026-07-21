import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../chart-of-accounts/schemas/account.schema';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { CostCentresModule } from '../cost-centres/cost-centres.module';
import { FinancialYearModule } from '../financial-year/financial-year.module';
import {
  FinancialYear,
  FinancialYearSchema,
} from '../financial-year/schemas/financial-year.schema';
import { JournalModule } from '../journal/journal.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { OpeningBalancesController } from './opening-balances.controller';
import { OpeningBalancesService } from './opening-balances.service';
import {
  OpeningBalancePack,
  OpeningBalancePackSchema,
} from './schemas/opening-balance-pack.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OpeningBalancePack.name, schema: OpeningBalancePackSchema },
      { name: Account.name, schema: AccountSchema },
      { name: FinancialYear.name, schema: FinancialYearSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    JournalModule,
    FinancialYearModule,
    CostCentresModule,
  ],
  controllers: [OpeningBalancesController],
  providers: [OpeningBalancesService],
  exports: [OpeningBalancesService, MongooseModule],
})
export class OpeningBalancesModule {}
