import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { ContractorDashboardController } from './contractor-dashboard.controller';
import { ContractorDashboardService } from './contractor-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contractor.name, schema: ContractorSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [ContractorDashboardController],
  providers: [ContractorDashboardService],
  exports: [ContractorDashboardService],
})
export class ContractorDashboardModule {}
