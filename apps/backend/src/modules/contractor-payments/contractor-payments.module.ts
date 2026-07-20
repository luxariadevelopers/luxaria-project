import { Module } from '@nestjs/common';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import { ContractorBillsModule } from '../contractor-bills/contractor-bills.module';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import { JournalModule } from '../journal/journal.module';
import { RbacModule } from '../rbac/rbac.module';
import { ContractorPaymentsController } from './contractor-payments.controller';
import { ContractorPaymentsService } from './contractor-payments.service';
import {
  ContractorPayment,
  ContractorPaymentSchema,
} from './schemas/contractor-payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContractorPayment.name, schema: ContractorPaymentSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      { name: Contractor.name, schema: ContractorSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    ContractorBillsModule,
    JournalModule,    ProjectAccessModule,

    RbacModule,
  ],
  controllers: [ContractorPaymentsController],
  providers: [ContractorPaymentsService],
  exports: [ContractorPaymentsService, MongooseModule],
})
export class ContractorPaymentsModule {}
