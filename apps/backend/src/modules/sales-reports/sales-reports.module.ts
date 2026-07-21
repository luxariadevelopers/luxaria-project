import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import {
  BookingCancellation,
  BookingCancellationSchema,
} from '../booking-cancellations/schemas/booking-cancellation.schema';
import {
  CustomerLoan,
  CustomerLoanSchema,
} from '../customer-loans/schemas/customer-loan.schema';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  CustomerWarranty,
  CustomerWarrantySchema,
} from '../customer-warranties/schemas/customer-warranty.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import {
  PaymentDemand,
  PaymentDemandSchema,
} from '../payment-schedules/schemas/payment-demand.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  UnitHandover,
  UnitHandoverSchema,
} from '../unit-handovers/schemas/unit-handover.schema';
import {
  UnitRegistration,
  UnitRegistrationSchema,
} from '../unit-registrations/schemas/unit-registration.schema';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import { SalesReportsController } from './sales-reports.controller';
import { SalesReportsService } from './sales-reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: BookingCancellation.name, schema: BookingCancellationSchema },
      { name: Unit.name, schema: UnitSchema },
      { name: PaymentDemand.name, schema: PaymentDemandSchema },
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
      { name: CustomerLoan.name, schema: CustomerLoanSchema },
      { name: UnitRegistration.name, schema: UnitRegistrationSchema },
      { name: UnitHandover.name, schema: UnitHandoverSchema },
      { name: CustomerWarranty.name, schema: CustomerWarrantySchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [SalesReportsController],
  providers: [SalesReportsService],
  exports: [SalesReportsService],
})
export class SalesReportsModule {}
