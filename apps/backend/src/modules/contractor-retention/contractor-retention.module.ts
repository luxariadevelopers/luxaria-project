import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { ContractorRetentionController } from './contractor-retention.controller';
import { ContractorRetentionService } from './contractor-retention.service';
import {
  ContractorRetention,
  ContractorRetentionSchema,
} from './schemas/contractor-retention.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContractorRetention.name, schema: ContractorRetentionSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [ContractorRetentionController],
  providers: [ContractorRetentionService],
  exports: [ContractorRetentionService, MongooseModule],
})
export class ContractorRetentionModule {}
