import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { ContractorRecoveriesController } from './contractor-recoveries.controller';
import { ContractorRecoveriesService } from './contractor-recoveries.service';
import {
  ContractorRecovery,
  ContractorRecoverySchema,
} from './schemas/contractor-recovery.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContractorRecovery.name, schema: ContractorRecoverySchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [ContractorRecoveriesController],
  providers: [ContractorRecoveriesService],
  exports: [ContractorRecoveriesService, MongooseModule],
})
export class ContractorRecoveriesModule {}
