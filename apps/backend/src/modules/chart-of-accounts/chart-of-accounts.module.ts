import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsSeedService } from './chart-of-accounts.seed.service';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { Account, AccountSchema } from './schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
  ],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService, ChartOfAccountsSeedService],
  exports: [ChartOfAccountsService, MongooseModule],
})
export class ChartOfAccountsModule {}
