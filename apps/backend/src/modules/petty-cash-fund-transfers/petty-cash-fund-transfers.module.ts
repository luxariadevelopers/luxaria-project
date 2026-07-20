import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashAccountsModule } from '../cash-accounts/cash-accounts.module';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import { JournalModule } from '../journal/journal.module';
import { PettyCashRequirementsModule } from '../petty-cash-requirements/petty-cash-requirements.module';
import { RbacModule } from '../rbac/rbac.module';
import { PettyCashFundTransfersController } from './petty-cash-fund-transfers.controller';
import { PettyCashFundTransfersService } from './petty-cash-fund-transfers.service';
import {
  PettyCashFundTransfer,
  PettyCashFundTransferSchema,
} from './schemas/petty-cash-fund-transfer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PettyCashFundTransfer.name, schema: PettyCashFundTransferSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
    ]),
    CashAccountsModule,
    PettyCashRequirementsModule,
    JournalModule,
    RbacModule,
  ],
  controllers: [PettyCashFundTransfersController],
  providers: [PettyCashFundTransfersService],
  exports: [PettyCashFundTransfersService, MongooseModule],
})
export class PettyCashFundTransfersModule {}
