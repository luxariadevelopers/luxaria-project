import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SaleAgreementsController } from './sale-agreements.controller';
import { SaleAgreementsService } from './sale-agreements.service';
import {
  SaleAgreement,
  SaleAgreementSchema,
} from './schemas/sale-agreement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SaleAgreement.name, schema: SaleAgreementSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [SaleAgreementsController],
  providers: [SaleAgreementsService],
  exports: [SaleAgreementsService, MongooseModule],
})
export class SaleAgreementsModule {}
