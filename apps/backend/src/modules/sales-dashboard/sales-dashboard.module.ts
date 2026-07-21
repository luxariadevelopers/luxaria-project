import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import {
  PaymentDemand,
  PaymentDemandSchema,
} from '../payment-schedules/schemas/payment-demand.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SalesDashboardController } from './sales-dashboard.controller';
import { SalesDashboardService } from './sales-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: PaymentDemand.name, schema: PaymentDemandSchema },
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [SalesDashboardController],
  providers: [SalesDashboardService],
  exports: [SalesDashboardService],
})
export class SalesDashboardModule {}
