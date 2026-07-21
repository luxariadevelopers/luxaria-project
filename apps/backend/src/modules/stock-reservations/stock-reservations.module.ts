import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { StockLedgerModule } from '../stock-ledger/stock-ledger.module';
import {
  StockReservation,
  StockReservationSchema,
} from './schemas/stock-reservation.schema';
import { StockReservationsController } from './stock-reservations.controller';
import { StockReservationsService } from './stock-reservations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockReservation.name, schema: StockReservationSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
    StockLedgerModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [StockReservationsController],
  providers: [StockReservationsService],
  exports: [StockReservationsService, MongooseModule],
})
export class StockReservationsModule {}
