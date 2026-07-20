import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { JournalModule } from '../journal/journal.module';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { CashAccountsController } from './cash-accounts.controller';
import { CashAccountsService } from './cash-accounts.service';
import {
  CashAccount,
  CashAccountSchema,
} from './schemas/cash-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashAccount.name, schema: CashAccountSchema },
    ]),
    ChartOfAccountsModule,
    JournalModule,
    ProjectsModule,
    UsersModule,
  ],
  controllers: [CashAccountsController],
  providers: [CashAccountsService],
  exports: [CashAccountsService, MongooseModule],
})
export class CashAccountsModule {}
