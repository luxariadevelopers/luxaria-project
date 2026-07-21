import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  CustomerWarranty,
  CustomerWarrantySchema,
} from '../customer-warranties/schemas/customer-warranty.schema';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  PaymentDemand,
  PaymentDemandSchema,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleSchema,
} from '../payment-schedules/schemas/payment-schedule.schema';
import {
  SaleAgreement,
  SaleAgreementSchema,
} from '../sale-agreements/schemas/sale-agreement.schema';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalService } from './customer-portal.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: PaymentDemand.name, schema: PaymentDemandSchema },
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
      { name: PaymentSchedule.name, schema: PaymentScheduleSchema },
      { name: SaleAgreement.name, schema: SaleAgreementSchema },
      { name: CustomerWarranty.name, schema: CustomerWarrantySchema },
      { name: DailyProgressReport.name, schema: DailyProgressReportSchema },
    ]),
  ],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalService],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}
