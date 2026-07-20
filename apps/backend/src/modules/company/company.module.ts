import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyController } from './company.controller';
import { CompanySeedService } from './company.seed.service';
import { CompanyService } from './company.service';
import {
  CompanyAddressHistory,
  CompanyAddressHistorySchema,
} from './schemas/company-address-history.schema';
import {
  CompanyCapitalHistory,
  CompanyCapitalHistorySchema,
} from './schemas/company-capital-history.schema';
import { Company, CompanySchema } from './schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: CompanyAddressHistory.name, schema: CompanyAddressHistorySchema },
      { name: CompanyCapitalHistory.name, schema: CompanyCapitalHistorySchema },
    ]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService, CompanySeedService],
  exports: [CompanyService, MongooseModule],
})
export class CompanyModule {}
