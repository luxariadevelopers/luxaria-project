import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalsModule } from '../approvals/approvals.module';
import { BookingsModule } from '../bookings/bookings.module';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import { JournalModule } from '../journal/journal.module';
import { RbacModule } from '../rbac/rbac.module';
import { Role, RoleSchema } from '../rbac/schemas/role.schema';
import { BookingCancellationsController } from './booking-cancellations.controller';
import { BookingCancellationsSeedService } from './booking-cancellations.seed.service';
import { BookingCancellationsService } from './booking-cancellations.service';
import {
  BookingCancellation,
  BookingCancellationSchema,
} from './schemas/booking-cancellation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BookingCancellation.name, schema: BookingCancellationSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    BookingsModule,
    ApprovalsModule,
    JournalModule,
    RbacModule,
  ],
  controllers: [BookingCancellationsController],
  providers: [BookingCancellationsService, BookingCancellationsSeedService],
  exports: [BookingCancellationsService, MongooseModule],
})
export class BookingCancellationsModule {}
