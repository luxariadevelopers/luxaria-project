import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import { JournalModule } from '../journal/journal.module';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { VendorInvoicesModule } from '../vendor-invoices/vendor-invoices.module';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  VendorPayment,
  VendorPaymentSchema,
} from './schemas/vendor-payment.schema';
import { VendorPaymentsController } from './vendor-payments.controller';
import { VendorPaymentsService } from './vendor-payments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VendorPayment.name, schema: VendorPaymentSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    VendorInvoicesModule,
    JournalModule,
  ],
  controllers: [VendorPaymentsController],
  providers: [VendorPaymentsService],
  exports: [VendorPaymentsService, MongooseModule],
})
export class VendorPaymentsModule {}
