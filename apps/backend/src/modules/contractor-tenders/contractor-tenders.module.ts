import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import { ContractorTendersController } from './contractor-tenders.controller';
import { ContractorTendersService } from './contractor-tenders.service';
import {
  ContractorTender,
  ContractorTenderSchema,
} from './schemas/contractor-tender.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContractorTender.name, schema: ContractorTenderSchema },
    ]),
    ProjectAccessModule,
    SitesModule,
    RbacModule,
  ],
  controllers: [ContractorTendersController],
  providers: [ContractorTendersService],
  exports: [ContractorTendersService, MongooseModule],
})
export class ContractorTendersModule {}
