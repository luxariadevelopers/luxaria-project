import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { JournalModule } from '../journal/journal.module';
import { ProjectsModule } from '../projects/projects.module';
import { RbacModule } from '../rbac/rbac.module';
import { CompanyBankAccountsController } from './company-bank-accounts.controller';
import { CompanyBankAccountsService } from './company-bank-accounts.service';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from './schemas/company-bank-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
    ]),
    ChartOfAccountsModule,
    JournalModule,
    ProjectsModule,
    RbacModule,
  ],
  controllers: [CompanyBankAccountsController],
  providers: [CompanyBankAccountsService],
  exports: [CompanyBankAccountsService, MongooseModule],
})
export class CompanyBankAccountsModule {}
