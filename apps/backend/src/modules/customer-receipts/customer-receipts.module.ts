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
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { JournalModule } from '../journal/journal.module';
import {
  PaymentDemand,
  PaymentDemandSchema,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleSchema,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { RbacModule } from '../rbac/rbac.module';
import { CustomerReceiptPdfService } from './customer-receipt-pdf.service';
import { CustomerReceiptsController } from './customer-receipts.controller';
import { CustomerReceiptsService } from './customer-receipts.service';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from './schemas/customer-receipt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: PaymentDemand.name, schema: PaymentDemandSchema },
      { name: PaymentSchedule.name, schema: PaymentScheduleSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    JournalModule,    ProjectAccessModule,

    RbacModule,
  ],
  controllers: [CustomerReceiptsController],
  providers: [CustomerReceiptsService, CustomerReceiptPdfService],
  exports: [CustomerReceiptsService, MongooseModule],
})
export class CustomerReceiptsModule {}
