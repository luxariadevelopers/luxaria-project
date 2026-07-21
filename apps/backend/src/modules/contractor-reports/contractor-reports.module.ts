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
import { ContractorReportsController } from './contractor-reports.controller';
import { ContractorReportsService } from './contractor-reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contractor.name, schema: ContractorSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [ContractorReportsController],
  providers: [ContractorReportsService],
  exports: [ContractorReportsService],
})
export class ContractorReportsModule {}
