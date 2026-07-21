import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  RateContract,
  RateContractSchema,
} from './schemas/rate-contract.schema';
import { RateContractsController } from './rate-contracts.controller';
import { RateContractsService } from './rate-contracts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RateContract.name, schema: RateContractSchema },
      { name: Contractor.name, schema: ContractorSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [RateContractsController],
  providers: [RateContractsService],
  exports: [RateContractsService, MongooseModule],
})
export class RateContractsModule {}
