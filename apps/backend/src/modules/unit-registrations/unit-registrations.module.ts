import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import {
  UnitRegistration,
  UnitRegistrationSchema,
} from './schemas/unit-registration.schema';
import { UnitRegistrationsController } from './unit-registrations.controller';
import { UnitRegistrationsService } from './unit-registrations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnitRegistration.name, schema: UnitRegistrationSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Unit.name, schema: UnitSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [UnitRegistrationsController],
  providers: [UnitRegistrationsService],
  exports: [UnitRegistrationsService, MongooseModule],
})
export class UnitRegistrationsModule {}
