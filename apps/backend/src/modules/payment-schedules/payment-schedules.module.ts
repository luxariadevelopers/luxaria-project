import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ApprovalsModule } from '../approvals/approvals.module';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { RbacModule } from '../rbac/rbac.module';
import { Role, RoleSchema } from '../rbac/schemas/role.schema';
import { PaymentSchedulesController } from './payment-schedules.controller';
import { PaymentSchedulesScheduler } from './payment-schedules.scheduler';
import { PaymentSchedulesSeedService } from './payment-schedules.seed.service';
import { PaymentSchedulesService } from './payment-schedules.service';
import {
  PaymentDemand,
  PaymentDemandSchema,
} from './schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleSchema,
} from './schemas/payment-schedule.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    MongooseModule.forFeature([
      { name: PaymentSchedule.name, schema: PaymentScheduleSchema },
      { name: PaymentDemand.name, schema: PaymentDemandSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    ApprovalsModule,
    RbacModule,
  ],
  controllers: [PaymentSchedulesController],
  providers: [
    PaymentSchedulesService,
    PaymentSchedulesScheduler,
    PaymentSchedulesSeedService,
  ],
  exports: [PaymentSchedulesService, MongooseModule],
})
export class PaymentSchedulesModule {}
