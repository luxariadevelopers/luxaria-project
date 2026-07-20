import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ApprovalsModule } from '../approvals/approvals.module';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { Role, RoleSchema } from '../rbac/schemas/role.schema';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import { UnitsModule } from '../units/units.module';
import { BookingPdfService } from './booking-pdf.service';
import { BookingsController } from './bookings.controller';
import { BookingsScheduler } from './bookings.scheduler';
import { BookingsSeedService } from './bookings.seed.service';
import { BookingsService } from './bookings.service';
import { Booking, BookingSchema } from './schemas/booking.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Unit.name, schema: UnitSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    UnitsModule,
    ApprovalsModule,
    RbacModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingPdfService,
    BookingsScheduler,
    BookingsSeedService,
  ],
  exports: [BookingsService, MongooseModule],
})
export class BookingsModule {}
